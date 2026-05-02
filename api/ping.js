module.exports = (req, res) => {
  res.json({ pong: true, time: new Date().toISOString() });
};
