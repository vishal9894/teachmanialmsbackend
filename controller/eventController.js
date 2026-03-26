const { pool } = require("../db/conntctDB");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/apiError");
const sendResponse = require("../utils/response");

const handleCreateEvent = catchAsync(async (req, res) => {
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

    if (!course_id || !event_name) {
      throw new ApiError(400, "Course ID and event name are required");
    }

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

    sendResponse(res, {
      statusCode: 201,
      message: "Event created successfully",
      data: event
    });

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

const handleGetEvents = catchAsync(async (req, res) => {
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

  sendResponse(res, {
    statusCode: 200,
    message: "Events fetched successfully",
    total: result.rows.length,
    data: result.rows
  });
});

const handleGetAllEvents = catchAsync(async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM course_events ORDER BY created_at DESC"
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Fetch all events successfully",
    total: result.rows.length,
    data: result.rows
  });
});

const handleDeleteEvents = catchAsync(async (req, res) => {
  const { id } = req.params;

  const isMatch = await pool.query(
    "SELECT id FROM course_events WHERE id=$1",
    [id]
  );

  if (!isMatch.rowCount) {
    throw new ApiError(404, "Event does not exist");
  }

  await pool.query("DELETE FROM course_events WHERE id=$1", [id]);
  await pool.query("DELETE FROM course_contents WHERE event_id=$1", [id]);

  sendResponse(res, {
    statusCode: 200,
    message: "Event deleted successfully"
  });
});

const handleUpdateEvents = catchAsync(async (req, res) => {
  const { id } = req.params;

  const {
    access,
    publish,
    event_name,
    stream_link,
    event_description,
    event_banner
  } = req.body;

  const checkExists = await pool.query(
    "SELECT id FROM course_events WHERE id=$1::uuid",
    [id]
  );

  if (!checkExists.rowCount) {
    throw new ApiError(404, "Event does not exist");
  }

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

  sendResponse(res, {
    statusCode: 200,
    message: "Event updated successfully",
    data: result.rows[0]
  });
});

const handlePublishEvents = catchAsync(async (req, res) => {
  const { id } = req.params;

  const check = await pool.query(
    "SELECT publish FROM course_events WHERE id=$1::uuid",
    [id]
  );

  if (!check.rowCount) {
    throw new ApiError(404, "Event does not exist");
  }

  const newStatus = !check.rows[0].publish;

  const result = await pool.query(
    `UPDATE course_events
     SET publish=$1, updated_at=NOW()
     WHERE id=$2::uuid
     RETURNING *`,
    [newStatus, id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: `Event ${newStatus ? "published" : "unpublished"} successfully`,
    data: result.rows[0]
  });
});

const handleCreateAttachment = catchAsync(async (req, res) => {
  let {
    content_id,
    event_id,
    title,
    attachment_type,
    file_url,
    external_link,
    test_id,
  } = req.body;

  if (!title || !attachment_type) {
    throw new ApiError(400, "title and attachment_type are required");
  }

  if (file_url && file_url.startsWith("blob:")) {
    throw new ApiError(400, "Invalid file_url. Upload file first and send real URL.");
  }

  let finalContentId = null;

  if (content_id) {
    const contentCheck = await pool.query(
      `SELECT id FROM course_contents WHERE id = $1`,
      [content_id]
    );

    if (contentCheck.rows.length) {
      finalContentId = content_id;
    }
  }

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

  if (!finalContentId) {
    throw new ApiError(400, "Invalid content_id or event_id (no matching course content)");
  }

  if (attachment_type === "pdf" || attachment_type === "file") {
    if (!file_url) {
      throw new ApiError(400, "file_url required for file/pdf attachment");
    }
  }

  if (attachment_type === "link" && !external_link) {
    throw new ApiError(400, "external_link required");
  }

  if (attachment_type === "test" && !test_id) {
    throw new ApiError(400, "test_id required");
  }

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

  sendResponse(res, {
    statusCode: 201,
    message: "Attachment created successfully",
    data: result.rows[0],
  });
});

const handleGetAttachments = catchAsync(async (req, res) => {
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

  sendResponse(res, {
    statusCode: 200,
    message: "Attachments fetched successfully",
    data: response
  });
});

const handleDeleteAttachment = catchAsync(async (req, res) => {
  const { id } = req.params;

  const checkExists = await pool.query(
    "SELECT id FROM content_attachments WHERE id=$1",
    [id]
  );

  if (!checkExists.rows.length) {
    throw new ApiError(404, "Attachment does not exist");
  }

  await pool.query(
    `DELETE FROM content_attachments WHERE id=$1`,
    [id]
  );

  sendResponse(res, {
    statusCode: 200,
    message: "Attachment deleted successfully"
  });
});

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