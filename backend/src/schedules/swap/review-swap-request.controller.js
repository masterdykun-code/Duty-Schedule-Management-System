import { pool } from "../../db.js";
import { parsePositiveId } from "../common/schedule-ids.js";
import { reviewSwapRequest } from "./swap.service.js";

export async function reviewSwapRequestByHead(req, res) {
  const client = await pool.connect();

  try {
    const requestId = parsePositiveId(req.params.requestId);
    if (!requestId) {
      return res.status(400).json({ message: "requestId khong hop le" });
    }

    const { approved, note } = req.body;
    if (typeof approved !== "boolean") {
      return res.status(400).json({ message: "Vui long chon duyet hoac tu choi" });
    }

    await client.query("BEGIN");

    const result = await reviewSwapRequest(client, {
      userId: req.user.sub,
      requestId,
      approved,
      note,
    });

    if (result.error) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: result.error });
    }

    await client.query("COMMIT");

    res.json({
      message: approved ? "Da duyet yeu cau doi ca" : "Da tu choi yeu cau doi ca",
      request_id: result.request.request_id,
      status: result.request.status,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Loi khi xu ly yeu cau doi ca",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
