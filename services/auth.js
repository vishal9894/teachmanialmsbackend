const jwt = require("jsonwebtoken");
const crypto = require("crypto");


// ================= ACCESS TOKEN =================
const GenerateAccessToken = (user, sessionId) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email ,
      role: user.role,
      sessionId: sessionId,
    },
    process.env.SECRET_ACTIVE_TOKEN,
    {
      expiresIn: "15m", // 🔥 Short-lived
    }
  );
};


// ================= REFRESH TOKEN (RANDOM STRING) =================
const GenerateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};


// ================= VERIFY ACCESS TOKEN =================
const VerifyAccessToken = (token) => {
  return jwt.verify(token, process.env.SECRET_ACTIVE_TOKEN);
};


module.exports = {
  GenerateAccessToken,
  GenerateRefreshToken,
  VerifyAccessToken,
};