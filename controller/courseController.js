const { pool } = require("../db/conntctDB");

const normalizeParentId = (parentId) => {
  if (
    parentId === undefined ||
    parentId === null ||
    parentId === "" ||
    parentId === "null"
  ) {
    return null;
  }
  return parentId;
};

const normalizeUUID = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "null"
  ) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  if (typeof value === "string" && value.startsWith("{")) {
    return value.replace(/[{}"]/g, "").split(",")[0];
  }

  return value;
};

const handleCreateCourse = async (req, res) => {
  try {
    const {
      coursetype,
      streamname,
      coursename,
      strikeoutprice,
      currentprice,
      productid,
      whatsappurl,
      coursedescription,
      introvideoid,
      coursefeatures,
      courseduration,
      coursedescriptionamount,
      upgradeduration,
      upgradeprice,
      syllabus,
      publish
    } = req.body;

    let featuresJSON = null;
    let syllabusJSON = null;

    if (coursefeatures)
      featuresJSON = JSON.stringify(JSON.parse(coursefeatures));

    if (syllabus)
      syllabusJSON = JSON.stringify(JSON.parse(syllabus));

    const timetable = req.files?.timetable?.[0]?.location || null;
    const batchinfo = req.files?.batchinfo?.[0]?.location || null;
    const courseimage = req.files?.courseimage?.[0]?.location || null;

    const result = await pool.query(
      `INSERT INTO courses
(coursetype,streamname,coursename,strikeoutprice,currentprice,productid,
whatsappurl,coursedescription,introvideoid,courseduration,
coursedescriptionamount,upgradeduration,upgradeprice,
coursefeatures,courseimage,timetable,batchinfo,syllabus,publish)
VALUES
($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
RETURNING *`,
      [
        coursetype,
        streamname,
        coursename,
        strikeoutprice || null,
        currentprice || null,
        productid,
        whatsappurl,
        coursedescription,
        introvideoid,
        courseduration,
        coursedescriptionamount,
        upgradeduration,
        upgradeprice || null,
        featuresJSON,
        courseimage,
        timetable,
        batchinfo,
        syllabusJSON,
        publish || false
      ]
    );

    res.json({
      success: true,
      message: "Course created",
      data: result.rows[0]
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const handleGetCourse = async (req, res) => {
  try {
    const { type } = req.params;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Course type is required"
      });
    }

    const result = await pool.query(
      `SELECT 
        c.*,
        t.id AS teacher_id,
        t.name AS teacher_name,
        t.account_id,
        t.revenue_share
       FROM courses c
       LEFT JOIN teachers t
       ON t.assigned_course_id = c.id
       WHERE c.coursetype = $1
       ORDER BY c.created_at DESC`,
      [type]
    );

    const data = result.rows.map(({ account_id, revenue_share, ...res }) => res);

    res.status(200).json({
      success: true,
      total: result.rows.length,
      data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const handleUpdatePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const { publish } = req.body;

    if (publish === undefined) {
      return res.status(400).json({
        success: false,
        message: "Publish value is required"
      });
    }

    const course = await pool.query(
      `SELECT id FROM courses WHERE id=$1`,
      [id]
    );

    if (course.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const result = await pool.query(
      `UPDATE courses
       SET publish=$1, updated_at=NOW()
       WHERE id=$2
       RETURNING *`,
      [publish, id]
    );

    res.status(200).json({
      success: true,
      message: "Publish status updated successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Publish Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

const handleUpdateCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      coursetype,
      streamname,
      coursename,
      strikeoutprice,
      currentprice,
      productid,
      whatsappurl,
      coursedescription,
      introvideoid,
      teacher,
      coursefeatures,
      courseduration,
      coursedescriptionamount,
      upgradeduration,
      upgradeprice,
      syllabus,
      publish
    } = req.body;

    let featuresJSON = coursefeatures
      ? JSON.stringify(JSON.parse(coursefeatures))
      : null;

    let syllabusJSON = syllabus
      ? JSON.stringify(JSON.parse(syllabus))
      : null;

    const timetable = req.files?.timetable?.[0]?.location || null;
    const batchinfo = req.files?.batchinfo?.[0]?.location || null;
    const courseimage = req.files?.courseimage?.[0]?.location || null;

    const result = await pool.query(
      `UPDATE courses
       SET coursetype=COALESCE($1,coursetype),
           streamname=COALESCE($2,streamname),
           coursename=COALESCE($3,coursename),
           strikeoutprice=COALESCE($4,strikeoutprice),
           currentprice=COALESCE($5,currentprice),
           productid=COALESCE($6,productid),
           whatsappurl=COALESCE($7,whatsappurl),
           coursedescription=COALESCE($8,coursedescription),
           introvideoid=COALESCE($9,introvideoid),
           teacher=COALESCE($10,teacher),
           courseduration=COALESCE($11,courseduration),
           coursedescriptionamount=COALESCE($12,coursedescriptionamount),
           upgradeduration=COALESCE($13,upgradeduration),
           upgradeprice=COALESCE($14,upgradeprice),
           coursefeatures=COALESCE($15,coursefeatures),
           syllabus=COALESCE($16,syllabus),
           publish=COALESCE($17,publish),
           courseimage=COALESCE($18,courseimage),
           timetable=COALESCE($19,timetable),
           batchinfo=COALESCE($20,batchinfo),
           updated_at=NOW()
       WHERE id=$21
       RETURNING *`,
      [
        coursetype || null,
        streamname || null,
        coursename || null,
        strikeoutprice || null,
        currentprice || null,
        productid || null,
        whatsappurl || null,
        coursedescription || null,
        introvideoid || null,
        teacher || null,
        courseduration || null,
        coursedescriptionamount || null,
        upgradeduration || null,
        upgradeprice || null,
        featuresJSON,
        syllabusJSON,
        publish,
        courseimage,
        timetable,
        batchinfo,
        id
      ]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: "Course not found" });

    res.json({
      success: true,
      message: "Course updated successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const handleDeleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM courses WHERE id=$1 RETURNING *",
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: "Course not found" });

    res.json({
      success: true,
      message: "Course deleted successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const handleCreateFolder = async (req, res) => {
  try {
    const { courseId, name, parentId } = req.body;

    const image = req.file?.location;

    const result = await pool.query(
      `INSERT INTO course_contents
       (course_id,name,type,parent_id , image)
       VALUES($1,$2,'folder',$3 , $4)
       RETURNING *`,
      [courseId, name, normalizeParentId(parentId), image]
    );

    res.status(201).json({
      success: true,
      message: "Folder created",
      data: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

const handleUploadFile = async (req, res) => {
  try {
    let {
      courseId,
      parentId,
      contentType,
      quizId,
      title,
      name,
      videoLink,
      source,
      access,
      description,
      duration,
      categories,
      negativeMarking,
      negativeMarks,
      testAccess,
      testType,
      postedBy,
      advancedMode
    } = req.body;

    courseId = normalizeUUID(courseId);
    parentId = normalizeUUID(parentId);
    quizId = normalizeUUID(quizId);

    const file = req.file;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course required",
      });
    }

    const courseCheck = await pool.query(
      "SELECT id FROM courses WHERE id=$1",
      [courseId]
    );

    if (!courseCheck.rows.length) {
      return res.status(400).json({
        success: false,
        message: "Course not found",
      });
    }

    let type = null;
    let fileUrl = null;
    let fileType = null;
    let referenceId = null;
    let contentName = title || name || "Untitled";


    if (contentType === "video") {

      if (!videoLink)
        return res.status(400).json({
          success: false,
          message: "Video link required",
        });

      type = "video";
      fileUrl = videoLink;
      fileType = "video/link";

      let contentMetadata = {
        source: source || "station1",
        access: access || "free",
      };


      if (file && file.mimetype.startsWith("image/")) {
        contentMetadata.thumbnail = file.location || file.path;
      }

      const result = await pool.query(
        `INSERT INTO course_contents
        (course_id,name,type,parent_id,file_url,file_type,reference_id,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
        [
          courseId,
          contentName,
          type,
          parentId || null,
          fileUrl,
          fileType,
          referenceId,
          JSON.stringify(contentMetadata),
        ]
      );

      return res.status(201).json({
        success: true,
        message: "Video added successfully",
        data: result.rows[0],
      });
    }


    if (contentType === "pdf") {

      if (!file)
        return res.status(400).json({
          success: false,
          message: "PDF file required",
        });

      if (file.mimetype !== "application/pdf")
        return res.status(400).json({
          success: false,
          message: "Only PDF allowed",
        });

      type = "pdf";
      fileUrl = file.location || file.path;
      fileType = file.mimetype;

      let contentMetadata = {
        access: access || "free",
        downloadType: "public",
      };

      const result = await pool.query(
        `INSERT INTO course_contents
        (course_id,name,type,parent_id,file_url,file_type,reference_id,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
        [
          courseId,
          contentName,
          type,
          parentId || null,
          fileUrl,
          fileType,
          referenceId,
          JSON.stringify(contentMetadata),
        ]
      );

      return res.status(201).json({
        success: true,
        message: "PDF added successfully",
        data: result.rows[0],
      });
    }


    if (contentType === "test") {

      if (!name)
        return res.status(400).json({
          success: false,
          message: "Test name required",
        });

      let contentMetadata = {
        description: description || "",
        duration: duration || 0,
        categories: categories ? JSON.parse(categories) : [],
        negativeMarking:
          negativeMarking === "true" || negativeMarking === true,
        negativeMarks: negativeMarks || 0,
        testAccess: testAccess || "free",
        testType: testType || "Live",
        postedBy: postedBy || "",
        advancedMode:
          advancedMode === "true" || advancedMode === true,
      };

      const result = await pool.query(
        `INSERT INTO course_contents
        (course_id,name,type,parent_id,file_url,file_type,reference_id,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING *`,
        [
          courseId,
          contentName,
          "test",
          parentId || null,
          null,
          "application/json",
          referenceId,
          JSON.stringify(contentMetadata),
        ]
      );

      return res.status(201).json({
        success: true,
        message: "Test added successfully",
        data: result.rows[0],
      });
    }

    if (contentType === "event") {

      const eventResult = await pool.query(
        `INSERT INTO events
        (course_id,folder_id,event_name,stream_link,event_description,event_banner,access,created_at,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
        RETURNING *`,
        [
          courseId,
          parentId || null,
          contentName,
          videoLink,
          description || "",
          file?.location || file?.path || null,
          access || "free",
        ]
      );

      return res.status(201).json({
        success: true,
        message: "Event added successfully",
        data: eventResult.rows[0],
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid content type",
    });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const handleGetFolderContent = async (req, res) => {
  try {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID required",
      });
    }

    const result = await pool.query(
      `
      SELECT 
        cc.id,
        cc.course_id,
        cc.name,
        cc.type,
        cc.parent_id,
        cc.file_url,
        cc.file_type,
        cc.reference_id,
        ca.id AS attachment_id,
        ca.file_url AS attachment_url,
        ca.title,
        ca.attachment_type
      FROM course_contents cc
      LEFT JOIN content_attachments ca
        ON cc.id = ca.content_id
      WHERE cc.course_id = $1
      ORDER BY cc.parent_id NULLS FIRST, cc.name;
      `,
      [courseId]
    );

    /* ---------- GROUP ATTACHMENTS ---------- */
    const map = new Map();

    result.rows.forEach(row => {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          name: row.name,
          type: row.type,
          parent_id: row.parent_id,
          file_url: row.file_url,
          file_type: row.file_type,
          reference_id: row.reference_id,
          attachments: [],
        });
      }

      if (row.attachment_id) {
        map.get(row.id).attachments.push({
          id: row.attachment_id,
          title: row.title,
          type: row.attachment_type,
          file_url: row.attachment_url,
        });
      }
    });

    const flatItems = Array.from(map.values());

    /* ---------- BUILD TREE ---------- */
    function buildTree(items, parentId = null) {
      return items
        .filter(i => i.parent_id === parentId)
        .map(i => ({
          id: i.id,
          name: i.name,
          type: i.type,
          file_url: i.file_url,
          file_type: i.file_type,
          reference_id: i.reference_id,
          attachments: i.attachments,
          children: buildTree(items, i.id),
        }));
    }

    const nestedData = buildTree(flatItems);

    res.json({
      success: true,
      data: nestedData,
    });

  } catch (error) {
    console.error("Get Folder Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
const handleDeleteContent = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `WITH RECURSIVE children AS (
        SELECT id FROM course_contents WHERE id=$1
        UNION ALL
        SELECT cc.id
        FROM course_contents cc
        INNER JOIN children c
        ON cc.parent_id=c.id
      )
      DELETE FROM course_contents
      WHERE id IN (SELECT id FROM children)`,
      [id]
    );

    res.json({ success: true, message: "Deleted successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};

const handlePurchaseCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseId } = req.body;

    const exists = await pool.query(
      `SELECT 1 FROM course_enrollments
     WHERE user_id=$1 AND course_id=$2`,
      [userId, courseId]
    );

    if (exists.rows.length) {
      return res.json({ message: "Already purchased" });
    }

    const purchase = await pool.query(
      `INSERT INTO course_enrollments (user_id, course_id)
     VALUES ($1,$2)
     RETURNING *`,
      [userId, courseId]
    );
    const data = purchase.rows[0]
    res.status(200).json({ success: true, message: "purchased course sucessfully", data })

  } catch (error) {

  }
};

const handleAssignMultipleCourses = async (req, res) => {
  try {
    const { userId, courseIds, } = req.body;

    if (!userId || !Array.isArray(courseIds) || courseIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "userId and courseIds required",
      });
    }

    const userCheck = await pool.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    );

    if (userCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const courseCheck = await pool.query(
      `SELECT id FROM courses WHERE id = ANY($1::uuid[])`,
      [courseIds]
    );

    if (courseCheck.rowCount !== courseIds.length) {
      const existingCourseIds = courseCheck.rows.map(row => row.id);
      const missingCourses = courseIds.filter(id => !existingCourseIds.includes(id));

      return res.status(404).json({
        success: false,
        message: `Some courses not found: ${missingCourses.join(', ')}`,
      });
    }

    const existingCourses = await pool.query(
      `SELECT course_id
       FROM course_enrollments
       WHERE user_id = $1
       AND course_id = ANY($2::uuid[])`,
      [userId, courseIds]
    );

    const alreadyAssigned = existingCourses.rows.map(
      (row) => row.course_id
    );


    const newCourses = courseIds.filter(
      (id) => !alreadyAssigned.includes(id)
    );

    if (newCourses.length > 0) {
      const insertPromises = newCourses.map(courseId =>
        pool.query(
          `INSERT INTO course_enrollments (user_id, course_id, created_at)
           VALUES ($1, $2, NOW())`,
          [userId, courseId]
        )
      );

      await Promise.all(insertPromises);
    }

    return res.status(200).json({
      success: true,
      message: "Course assignment completed",
      assignedCount: newCourses.length,
      alreadyAssignedCount: alreadyAssigned.length,
      alreadyAssigned,
    });

  } catch (error) {
    console.error("Assign Courses Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error: " + error.message,
    });
  }
};

const handleGetAssignCourse = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM course_enrollments ORDER BY created_at DESC`
    );

    res.status(200).json({
      success: true,
      message: "Fetch assign courses successfully",
      data: result.rows
    });

  } catch (error) {
    console.error("Error fetching assigned courses:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch assigned courses",
      error: error.message
    });
  }
};
const handleDeleteAssingCourse = async (req, res) => {
  try {
    const { userId, courseId } = req.query;

    const courseIds = [courseId];

    console.log("Query params:", { userId, courseId });

    if (!userId || !courseId) {
      return res.status(400).json({
        success: false,
        message: "userId and courseId required",
      });
    }

    const userCheck = await pool.query(
      `SELECT id FROM users WHERE id = $1`,
      [userId]
    );

    if (userCheck.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const existing = await pool.query(
      `SELECT course_id
       FROM course_enrollments
       WHERE user_id = $1
       AND course_id = ANY($2::uuid[])`,
      [userId, courseIds]
    );

    if (existing.rowCount === 0) {
      return res.status(400).json({
        success: false,
        message: "No assigned courses found to delete",
      });
    }

    await pool.query(
      `DELETE FROM course_enrollments
       WHERE user_id = $1
       AND course_id = ANY($2::uuid[])`,
      [userId, courseIds]
    );

    res.status(200).json({
      success: true,
      message: "Assigned courses removed successfully",
      deletedCount: existing.rowCount,
    });

  } catch (error) {
    console.error("Delete Assigned Course Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


const handleMyCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(userId);

    const courses = await pool.query(`
    SELECT c.*
    FROM course_enrollments ce
    JOIN courses c ON c.id = ce.course_id
    WHERE ce.user_id = $1
  `, [userId]);

    const data = courses.rows

    console.log(data);


    res.status(200).json({ success: true, message: " fetch purchage course sucessfully", data })

  } catch (error) {

  }
};

module.exports = {
  handleCreateCourse,
  handleGetCourse,
  handleUpdatePublish,
  handleUpdateCourse,
  handleDeleteCourse,
  handleCreateFolder,
  handleGetFolderContent,
  handleUploadFile,
  handleDeleteContent,
  handlePurchaseCourse,
  handleMyCourses,
  handleAssignMultipleCourses,
  handleGetAssignCourse,
  handleDeleteAssingCourse
};