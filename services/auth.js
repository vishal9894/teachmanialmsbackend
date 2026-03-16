const jwt = require("jsonwebtoken");
const crypto = require("crypto");



const GenerateAccessToken = (user, sessionId) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      sessionId: sessionId,
    },
    process.env.SECRET_ACTIVE_TOKEN,
    {
      expiresIn: "7h",
    }
  );
};


const GenerateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};



const VerifyAccessToken = (token) => {
  return jwt.verify(token, process.env.SECRET_ACTIVE_TOKEN);
};


module.exports = {
  GenerateAccessToken,
  GenerateRefreshToken,
  VerifyAccessToken,
};