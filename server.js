const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb+srv://avineshgupta999:hI9Ftv5XOkae8URm@cluster0.n4vbw0e.mongodb.net/?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

// event listener for successful connection
db.on("connected", () => {
  console.log("Connected to MongoDB!");
});

// event listener for connection error
db.on("error", (err) => {
  console.error("Connection error:", err);
});

// event listener for disconnection
db.on("disconnected", () => {
  console.log("Disconnected from MongoDB!");
})

const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  contacts: [contactSchema],
});

const User = mongoose.model("User", userSchema);

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const user = new User({
    username,
    password: hashedPassword,
    contacts: [],
  });
  await user.save();
  res.json({ message: "User created successfully" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ username }, "mysecretkey");
  res.json({ token });
});

const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Authentication failed" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decodedToken = jwt.verify(token, "mysecretkey");
    req.username = decodedToken.username;
    next();
  } catch (error) {
    res.status(401).json({ message: "Authentication failed" });
  }
};

app.get("/contacts", authenticateUser, async (req, res) => {
  const user = await User.findOne({ username: req.username });
  res.json(user.contacts);
});

app.post("/contacts", authenticateUser, async (req, res) => {
  const user = await User.findOne({ username: req.username });
  const { name, email, phone } = req.body;
  const contact = { name, email, phone };
  user.contacts.push(contact);
  await user.save();
  res.json({ message: "Contact added successfully" });
});

app.put("/contacts/:id", authenticateUser, async (req, res) => {
  const user = await User.findOne({ username: req.username });
  const contact = user.contacts.id(req.params.id);
  if (!contact) {
    return res.status(404).json({ message: "Contact not found" });
  }
  const { name, email, phone } = req.body;
  contact.name = name;
  contact.email = email;
  contact.phone = phone;
  await user.save();
  res.json({ message: "Contact updated successfully" });
});

app.delete("/contacts/:id", authenticateUser, async (req, res) => {
  const user = await User.findOne({ username: req.username });
  const contact = user.contacts.id(req.params.id);
  if (!contact) {
    return res.status(404).json({ message: "Contact not found"});
  }
  contact.remove();
  await user.save();
  res.json({ message: "Contact deleted successfully" });
});

  
  const PORT = 5000;
  
  app.listen(PORT, () => {
  console.log(`Server started listening on port ${PORT}`);
  });
