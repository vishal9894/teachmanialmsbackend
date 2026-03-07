const { pool } = require("../db/conntctDB");


const HandleCreateCourse = async (req, res) => {
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

    if (coursefeatures) {
      featuresJSON = JSON.stringify(JSON.parse(coursefeatures));
    }

    if (syllabus) {
      syllabusJSON = JSON.stringify(JSON.parse(syllabus));
    }

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
  }
};


const HandleGetCourse = async (req, res) => {
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

    const data = result.rows.map(({ account_id, revenue_share, ...res }) => res)

    res.status(200).json({
      success: true,
      total: result.rows.length,
      data
    });

  } catch (error) {
    console.error("Get Course Error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error"
    });
  }
};



const HandleUpdatePublish = async (req, res) => {
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
       SET publish = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, id]
    );

    res.status(200).json({
      success: true,
      message: "Publish status updated",
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

const HandleUpdateCourse = async (req, res) => {
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

    // Convert JSON fields
    let featuresJSON = coursefeatures
      ? JSON.stringify(JSON.parse(coursefeatures))
      : null;

    let syllabusJSON = syllabus
      ? JSON.stringify(JSON.parse(syllabus))
      : null;

    // Files
    const timetable = req.files?.timetable?.[0]?.location || null;
    const batchinfo = req.files?.batchinfo?.[0]?.location || null;
    const courseimage = req.files?.courseimage?.[0]?.location || null;

    const result = await pool.query(
      `UPDATE courses
       SET coursetype = COALESCE($1, coursetype),
           streamname = COALESCE($2, streamname),
           coursename = COALESCE($3, coursename),
           strikeoutprice = COALESCE($4, strikeoutprice),
           currentprice = COALESCE($5, currentprice),
           productid = COALESCE($6, productid),
           whatsappurl = COALESCE($7, whatsappurl),
           coursedescription = COALESCE($8, coursedescription),
           introvideoid = COALESCE($9, introvideoid),
           teacher = COALESCE($10, teacher),
           courseduration = COALESCE($11, courseduration),
           coursedescriptionamount = COALESCE($12, coursedescriptionamount),
           upgradeduration = COALESCE($13, upgradeduration),
           upgradeprice = COALESCE($14, upgradeprice),
           coursefeatures = COALESCE($15, coursefeatures),
           syllabus = COALESCE($16, syllabus),
           publish = COALESCE($17, publish),
           courseimage = COALESCE($18, courseimage),
           timetable = COALESCE($19, timetable),
           batchinfo = COALESCE($20, batchinfo),
           updated_at = NOW()
       WHERE id = $21
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

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Update Course Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


const HandleDeleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM courses WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
      data: result.rows[0],
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


module.exports = {
  HandleCreateCourse,
  HandleGetCourse,
  HandleUpdatePublish,
  HandleUpdateCourse,
  HandleDeleteCourse
};