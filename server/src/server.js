const app = require("./app");
const env = require("./config/env");
const { connectDb } = require("./config/db");

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
