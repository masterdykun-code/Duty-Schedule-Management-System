import { pool } from "../../db.js";
import { parsePositiveId } from "../common/schedule-ids.js";
import { respondToSwapRequest } from "./swap.service.js";

export async function respondSwapRequest(req, res) {
  const client = await pool.connect();

  try {
    const requestId = parsePositiveId(req.params.requestId);
    if (!requestId) {
      return res.status(400).json({ message: "requestId khong hop le" });
    }

    const { accepted, note } = req.body;
    if (typeof accepted !== "boolean") {
      return res.status(400).json({ message: "Vui long chon dong y hoac tu choi" });
    }

    await client.query("BEGIN");

    const result = await respondToSwapRequest(client, {
      user: req.user,
      requestId,
      accepted,
      note,
    });

    if (result.error) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: result.error });
    }

    await client.query("COMMIT");

    res.json({
      message: accepted ? "Da phan hoi dong y yeu cau doi ca" : "Da tu choi yeu cau doi ca",
      request_id: result.request.request_id,
      status: result.request.status,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({
      message: "Loi khi phan hoi yeu cau doi ca",
      error: error.message,
    });
  } finally {
    client.release();
  }
}
