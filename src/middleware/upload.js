// Image uploads (news covers). Files are held in memory, checked, then written to
// public/uploads/<folder>/ under a random name.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'public', 'uploads');
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

const memory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 40 },
  fileFilter(req, file, cb) {
    if (!ALLOWED.includes(file.mimetype)) {
      req.uploadError = 'Only JPG, PNG or WebP images are allowed.';
      return cb(null, false);
    }
    return cb(null, true);
  },
});

// Use as route middleware: uploadImage('cover'). Problems are reported through
// req.uploadError so the controller can show them next to the field.
const uploadImage = (field) => (req, res, next) => {
  memory.single(field)(req, res, (err) => {
    if (err) {
      req.uploadError = err.code === 'LIMIT_FILE_SIZE' ? 'The image is too large (maximum 3 MB).' : 'The image could not be uploaded.';
    }
    if (!req.body) req.body = {};
    next();
  });
};

// Look at the real file bytes (the browser-supplied type cannot be trusted).
function detectType(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}

// Saves an uploaded file and returns its web path, e.g. /uploads/news/ab12.jpg
async function saveImage(file, folder) {
  const type = detectType(file.buffer);
  if (!type) throw new Error('That file is not a valid JPG, PNG or WebP image.');
  const dir = path.join(UPLOAD_ROOT, folder);
  await fs.promises.mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${type}`;
  await fs.promises.writeFile(path.join(dir, name), file.buffer);
  return `/uploads/${folder}/${name}`;
}

// Deletes a previously saved file (only inside the uploads folder).
async function removeImage(webPath) {
  if (typeof webPath !== 'string' || !webPath.startsWith('/uploads/')) return;
  const full = path.normalize(path.join(UPLOAD_ROOT, webPath.slice('/uploads/'.length)));
  if (!full.startsWith(UPLOAD_ROOT + path.sep)) return;
  try {
    await fs.promises.unlink(full);
  } catch (err) {
    /* already gone */
  }
}

module.exports = { uploadImage, saveImage, removeImage };
