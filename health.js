export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    api: "sivashakthi-invoice",
    databaseConfigured: Boolean(process.env.DATABASE_URL)
  });
}
