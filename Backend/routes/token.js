const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }
  const token = req.cookies.jwt || req.headers["authorization"]?.split(" ")[1]; // Extract JWT from HttpOnly cookie

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Token not found" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token

    // Check if the token has expired (automatically checked by jwt.verify if exp is set)
    if (decoded.exp < Date.now() / 1000) {
      return res.status(403).json({ message: "Forbidden: Token expired" });
    }

    req.user = decoded; // Attach the decoded payload to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    return res.status(403).json({ message: "Forbidden: Invalid token" }); //If the token is missing or invalid, it returns a 401 Unauthorized or 403 Forbidden response, respectively.
  }
}

module.exports = authenticateToken;
