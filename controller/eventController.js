const { pool } = require("../db/conntctDB");


const handleCreateEvent = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      access,
      publish,
      course_id,
      folderid,
      event_name,
      stream_link,
      event_description,
      event_banner,
      category_name
    } = req.body;

    await client.query("BEGIN");

    const eventResult = await client.query(
      `INSERT INTO course_events
      (access,publish,course_id,folder_id,event_name,
       stream_link,event_description,event_banner,category_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        access,
        publish,
        course_id,
        folderid || null,
        event_name,
        stream_link,
        event_description,
        event_banner,
        category_name
      ]
    );

    const event = eventResult.rows[0];


    await client.query(
      `INSERT INTO course_contents
      (course_id,name,type,parent_id,event_id)
      VALUES ($1,$2,'event',$3,$4)`,
      [course_id, event.event_name, folderid || null, event.id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      data: event
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    client.release();
  }
};


const handleGetEvents = async (req, res) => {
  try {
    const folderid = req.params.id;

    const result = await pool.query(
      `
      SELECT 
        e.*,
        f.name AS folder_name
      FROM course_events e
      LEFT JOIN course_contents f
        ON e.folder_id = f.id
      WHERE e.folder_id IS NOT DISTINCT FROM $1
      ORDER BY e.created_at DESC
      `,
      [folderid || null]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error("Get Events Error:", error);
    res.status(500).json({ success: false });
  }
};

const handleGetAllEvents = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM course_events"
    )

    const data = result.rows.map((res) => res)
    res.status(200).json({ success: true, message: "fetch all events", data })
  } catch (error) {

  }
}

const handleDeleteEvents = async (req, res) => {
  try {
    const { id } = req.params;

    const isMatch = await pool.query(
      "SELECT id FROM course_events WHERE id=$1",
      [id]
    );

    if (!isMatch.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Event does not exist"
      });
    }

    await pool.query("DELETE FROM course_events WHERE id=$1", [id]);
    await pool.query("DELETE FROM course_contents WHERE event_id=$1", [id]);

    res.json({
      success: true,
      message: "Event deleted successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};


const handleUpdateEvents = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      access,
      publish,
      event_name,
      stream_link,
      event_description,
      event_banner
    } = req.body;

    const result = await pool.query(
      `UPDATE course_events
       SET access=$1,
           publish=$2,
           event_name=$3,
           stream_link=$4,
           event_description=$5,
           event_banner=$6,
           updated_at=NOW()
       WHERE id=$7::uuid
       RETURNING *`,
      [
        access,
        publish,
        event_name,
        stream_link,
        event_description,
        event_banner,
        id
      ]
    );


    await pool.query(
      `UPDATE course_contents
       SET name=$1
       WHERE event_id=$2::uuid`,
      [event_name, id]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Update Event Error:", error.message);
    res.status(500).json({ success: false });
  }
};

const handlePublishEvents = async (req, res) => {
  try {
    const { id } = req.params;

    const check = await pool.query(
      "SELECT publish FROM course_events WHERE id=$1::uuid",
      [id]
    );

    if (!check.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Event does not exist"
      });
    }

    const newStatus = !check.rows[0].publish;

    const result = await pool.query(
      `UPDATE course_events
       SET publish=$1, updated_at=NOW()
       WHERE id=$2::uuid
       RETURNING *`,
      [newStatus, id]
    );

    res.json({
      success: true,
      message: "Publish status updated",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Publish Event Error:", error.message);
    res.status(500).json({ success: false });
  }
};

const handleCreateAttachment = async (req, res) => {
  try {
    let {
      content_id,
      event_id,
      title,
      attachment_type,
      file_url,
      external_link,
      test_id,
    } = req.body;

    /* =====================================================
       1️⃣ BASIC VALIDATION
    ===================================================== */

    if (!title || !attachment_type) {
      return res.status(400).json({
        success: false,
        message: "title and attachment_type are required",
      });
    }

    /* =====================================================
       2️⃣ DO NOT ALLOW BLOB URL (FRONTEND BUG FIX)
    ===================================================== */

    if (file_url && file_url.startsWith("blob:")) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid file_url. Upload file first and send real URL.",
      });
    }

    /* =====================================================
       3️⃣ FIND VALID CONTENT_ID
       (handles wrong id from frontend safely)
    ===================================================== */

    let finalContentId = null;

    // Case A — content_id provided
    if (content_id) {
      const contentCheck = await pool.query(
        `SELECT id FROM course_contents WHERE id = $1`,
        [content_id]
      );

      if (contentCheck.rows.length) {
        finalContentId = content_id;
      }
    }

    // Case B — resolve using event_id
    if (!finalContentId && event_id) {
      const eventContent = await pool.query(
        `
        SELECT id
        FROM course_contents
        WHERE event_id = $1
        LIMIT 1
        `,
        [event_id]
      );

      if (eventContent.rows.length) {
        finalContentId = eventContent.rows[0].id;
      }
    }

    // Case C — frontend passed event_id as content_id
    if (!finalContentId && content_id) {
      const fallback = await pool.query(
        `
        SELECT id
        FROM course_contents
        WHERE event_id = $1
        LIMIT 1
        `,
        [content_id]
      );

      if (fallback.rows.length) {
        finalContentId = fallback.rows[0].id;
      }
    }

    // Still not found
    if (!finalContentId) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid content_id or event_id (no matching course content)",
      });
    }

    /* =====================================================
       4️⃣ ATTACHMENT TYPE VALIDATION
    ===================================================== */

    if (attachment_type === "pdf" || attachment_type === "file") {
      if (!file_url) {
        return res.status(400).json({
          success: false,
          message: "file_url required for file/pdf attachment",
        });
      }
    }

    if (attachment_type === "link" && !external_link) {
      return res.status(400).json({
        success: false,
        message: "external_link required",
      });
    }

    if (attachment_type === "test" && !test_id) {
      return res.status(400).json({
        success: false,
        message: "test_id required",
      });
    }

    /* =====================================================
       5️⃣ INSERT ATTACHMENT (FOREIGN KEY SAFE)
    ===================================================== */

    const result = await pool.query(
      `
      INSERT INTO content_attachments
      (
        content_id,
        title,
        attachment_type,
        file_url,
        external_link,
        test_id
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        finalContentId,
        title,
        attachment_type,
        file_url || null,
        external_link || null,
        test_id || null,
      ]
    );

    /* =====================================================
       6️⃣ SUCCESS RESPONSE
    ===================================================== */

    return res.status(201).json({
      success: true,
      message: "Attachment created successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Create Attachment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while creating attachment",
    });
  }
};
const handleGetAttachments = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        attachment_type,
        json_agg(
          json_build_object(
            'id',id,
            'title',title,
            'file_url',file_url,
            'external_link',external_link,
            'test_id',test_id
          )
        ) AS items
      FROM content_attachments
      WHERE content_id=$1
      GROUP BY attachment_type
      `,
      [id]
    );

    const response = { pdf: [], test: [], link: [] };

    result.rows.forEach(r => {
      response[r.attachment_type] = r.items;
    });

    res.json({ success: true, data: response });

  } catch (error) {
    res.status(500).json({ success: false });
  }
};

const handleDeleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `DELETE FROM event_attachments WHERE id=$1`,
      [id]
    );

    res.json({
      success: true,
      message: "Attachment deleted successfully"
    });

  } catch (error) {
    console.error("Delete Attachment Error:", error);
    res.status(500).json({ success: false });
  }
};


module.exports = {
  handleCreateEvent,
  handleGetEvents,
  handleDeleteEvents,
  handleUpdateEvents,
  handlePublishEvents,
  handleCreateAttachment,
  handleGetAttachments,
  handleDeleteAttachment,
  handleGetAllEvents
};