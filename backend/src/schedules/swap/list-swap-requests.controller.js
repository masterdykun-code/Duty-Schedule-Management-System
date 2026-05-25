import { pool } from "../../db.js";
import { mapSwapRequest } from "./swap.mappers.js";
import { listSwapRequests } from "./swap.service.js";

export async function getSwapRequests(req, res) {
  try {
    const result = await listSwapRequests(pool, req.user);

    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    res.json({
      expired_count: result.expiredCount,
      data: result.requests.map(mapSwapRequest),
    });
  } catch (error) {
    res.status(500).json({
      message: "Loi khi lay danh sach yeu cau doi ca",
      error: error.message,
    });
  }
}
