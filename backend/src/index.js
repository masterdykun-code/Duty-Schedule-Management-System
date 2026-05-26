import { createApp } from "./app.js";
import { testConnection } from "./db.js";

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, async () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  await testConnection();
});
