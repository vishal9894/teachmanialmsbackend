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

    const course = await pool.query(
      `SELECT publish FROM courses WHERE id = $1`,
      [id]
    );

    if (course.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    const newStatus = !course.rows[0].publish;

    const result = await pool.query(
      `UPDATE courses
       SET publish=$1, updated_at=NOW()
       WHERE id=$2
       RETURNING *`,
      [newStatus, id]
    );

    res.status(200).json({
      success: true,
      message: "Publish status updated",
      data: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
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

    const result = await pool.query(
      `INSERT INTO course_contents
       (course_id,name,type,parent_id)
       VALUES($1,$2,'folder',$3)
       RETURNING *`,
      [courseId, name, normalizeParentId(parentId)]
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
    const { courseId, parentId, contentType, quizId, name, videoLink } = req.body;
    const file = req.file;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "Course required" });
    }



    const courseCheck = await pool.query(
      "SELECT id FROM courses WHERE id=$1",
      [courseId]
    );

    if (!courseCheck.rows.length) {
      return res.status(400).json({ success: false, message: "Course not found" });
    }


    if (parentId) {
      const parentCheck = await pool.query(
        "SELECT id,type FROM course_contents WHERE id=$1",
        [parentId]
      );

      if (!parentCheck.rows.length) {
        return res.status(400).json({ success: false, message: "Parent not found" });
      }

      const parentType = parentCheck.rows[0].type;

      if (!["folder", "video"].includes(parentType)) {
        return res.status(400).json({ success: false, message: "Content allowed only inside folder or video" });
      }
    }


    let type = null;
    let fileUrl = null;
    let fileType = null;
    let referenceId = null;
    let contentName = name || null;


    if (contentType === "video") {
      if (!videoLink) {
        return res.status(400).json({ success: false, message: "Video link required" });
      }

      type = "video";
      contentName = contentName || "Video";
      fileUrl = videoLink; 
      fileType = "video/link";
    }


    else if (contentType === "test") {
      if (!quizId) {
        return res.status(400).json({ success: false, message: "Quiz ID required" });
      }

      const quizCheck = await pool.query(
        "SELECT id FROM quizzes WHERE id=$1",
        [quizId]
      );

      if (!quizCheck.rows.length) {
        return res.status(400).json({ success: false, message: "Invalid quiz ID" });
      }

      type = "test";
      contentName = contentName || "Quiz Test";
      referenceId = quizId;
    }


    else if (contentType === "pdf") {
      if (!file) {
        return res.status(400).json({ success: false, message: "PDF file required" });
      }

      if (file.mimetype !== "application/pdf") {
        return res.status(400).json({ success: false, message: "Only PDF files are allowed" });
      }

      type = "pdf";
      contentName = contentName || file.originalname;
      fileUrl = file.location;
      fileType = file.mimetype;
    }


    else {
      return res.status(400).json({ success: false, message: "Invalid content type" });
    }


    const result = await pool.query(
      `INSERT INTO course_contents
       (course_id,name,type,parent_id,file_url,file_type,reference_id)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        courseId,
        contentName,
        type,
        parentId || null,
        fileUrl,
        fileType,
        referenceId
      ]
    );

    res.status(201).json({
      success: true,
      message: "Content added successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ success: false, message: error.message });
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
      SELECT id, course_id, name, type, parent_id, file_url, file_type, reference_id
      FROM course_contents
      WHERE course_id = $1
      ORDER BY parent_id, name;
      `,
      [courseId]
    );

    const flatItems = result.rows;

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

const handleMyCourses = async (req, res) => {
  try {
    const userId = req.user.id;

    const courses = await pool.query(`
    SELECT c.*
    FROM course_enrollments ce
    JOIN courses c ON c.id = ce.course_id
    WHERE ce.user_id = $1
  `, [userId]);

  const data = courses.rows[0]

    res.status(200).json({success : true , message : " fetch purchage course sucessfully" , data})

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
  handleMyCourses
};