const express = require("express");
const { connectDB } = require("./db/conntctDB");
require("dotenv").config();
const userRoute = require("./routes/userRoute");
const PromotionRoute = require("./routes/promotionRoute");
const bannerRoute = require("./routes/bannerRoute");
const courseRoute = require("./routes/courseRoute");
const strimeRoute = require("./routes/streamRoute");
const teacherRoute = require("./routes/teacherRoute");
const quizRoute = require("./routes/quizRoute");
const socialmediaRoute = require("./routes/socialMediaRoute");
const cors = require("cors");


const app = express();


const port = process.env.PORT || 4000

connectDB();

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
    res.send("server is running")
})

app.use("/api/user", userRoute)
app.use("/api/promotion", PromotionRoute)
app.use("/api/banner", bannerRoute)
app.use("/api/course", courseRoute);
app.use("/api/strime", strimeRoute);
app.use("/api/teacher", teacherRoute)
app.use("/api/quiz", quizRoute)
app.use("/api/social", socialmediaRoute)


app.listen(port, () => {
    console.log(`server is running port ${port}`);

})