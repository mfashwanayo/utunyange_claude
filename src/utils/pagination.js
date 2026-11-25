// Page numbers for list screens.
function paginate(total, page, perPage = 15) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, Number(page) || 1), pages);
  const offset = (current - 1) * perPage;
  return {
    page: current,
    pages,
    perPage,
    total,
    offset,
    from: total ? offset + 1 : 0,
    to: Math.min(total, offset + perPage),
  };
}

module.exports = { paginate };
