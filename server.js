const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const multer = require("multer");
const app = express();
const PORT = 5000;
app.use("/uploads", express.static("uploads"));


// Middleware
app.use(bodyParser.json());
app.use(cors());
// app.use(express.static(path.join(__dirname, "build"))); // Serve React build files

// Data storage (JSON files)
const usersFile = "users.json";
const productsFile = "products.json";
const cartFile = "cart.json";

// Ensure JSON files exist
const ensureFileExists = (file, defaultContent) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultContent, null, 2));
  }
};
ensureFileExists(usersFile, []);
ensureFileExists(productsFile, []);
ensureFileExists(cartFile, []);

// Helper functions
const readJSON = (file) => JSON.parse(fs.readFileSync(file));
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Register
app.post("/api/register", (req, res) => {
  const { name, mobile, password } = req.body;
  const users = readJSON(usersFile);

  if (users.find((user) => user.mobile === mobile)) {
    return res.status(400).json({ message: "Mobile number already registered." });
  }

  users.push({ name, mobile, password, role: "user" });
  writeJSON(usersFile, users);
  res.status(201).json({ message: "Registration successful." });
});

// Login
app.post("/api/login", (req, res) => {
  const { mobile, password } = req.body;
  const users = readJSON(usersFile);

  // Admin login
  if (mobile==='1234567890' && password==='admin') {
    // const admin = users.find((user) => user.mobile === username && user.password === password && user.role === "admin");
    // if (!admin) return res.status(401).json({ message: "Invalid admin credentials." });
    return res.json({ message: "Admin login successful." ,role:'admin'});
  }


  // User login
  const user = users.find((u) => u.mobile === mobile && u.password === password);
  if (!user) return res.status(401).json({ message: "Invalid credentials." });

  res.json({ message: "User login successful." ,role:'user'});
});

// Add Product (Admin)
app.post("/api/products", (req, res) => {
  const { price, cost, quantity } = req.body;
  const products = readJSON(productsFile);

  const productId = products.length ? products[products.length - 1].productId + 1 : 1;
  products.push({ productId, price, images, quantity });
  writeJSON(productsFile, products);

  res.status(201).json({ message: "Product added successfully." });
});

// Update Product (Admin)
app.put("/api/products/:productId", (req, res) => {
  const { productId } = req.params;
  const { price, image, quantity } = req.body;
  const products = readJSON(productsFile);

  const product = products.find((p) => p.productId === parseInt(productId));
  if (!product) return res.status(404).json({ message: "Product not found." });

  product.price = price;
  product.image = image;
  product.quantity = quantity;
  writeJSON(productsFile, products);

  res.json({ message: "Product updated successfully." });
});

// Delete Product (Admin)
app.delete("/api/products/:productId", (req, res) => {
  const { productId } = req.params;
  const products = readJSON(productsFile);

  const filteredProducts = products.filter((p) => p.productId !== parseInt(productId));
  if (filteredProducts.length === products.length) return res.status(404).json({ message: "Product not found." });

  writeJSON(productsFile, filteredProducts);
  res.json({ message: "Product deleted successfully." });
});

// Get All Products (User)
app.get("/api/products", (req, res) => {
  const products = readJSON(productsFile);
  res.json(products);
});

// Add to Cart (User-specific)
app.post("/api/cart", (req, res) => {
    const { mobile, productId, quantity } = req.body; // Expect the user's mobile number to be sent
    const cart = readJSON(cartFile);
  
    let userCart = cart.find((c) => c.mobile === mobile);
    if (!userCart) {
      // If the user's cart doesn't exist, create one
      userCart = { mobile, items: [] };
      cart.push(userCart);
    }
  
    const existingItem = userCart.items.find((item) => item.productId === productId);
    if (existingItem) {
      existingItem.quantity += quantity; // Update quantity if item already exists
    } else {
      userCart.items.push({ productId, quantity }); // Add new item
    }
  
    writeJSON(cartFile, cart);
    res.status(201).json({ message: "Product added to cart." });
  });
  
  // Get Cart Items (User-specific)
app.get("/api/cart/:mobile", (req, res) => {
    const { mobile } = req.params;
    const cart = readJSON(cartFile);
  
    const userCart = cart.find((c) => c.mobile === mobile);
    if (!userCart) {
      return res.json({ items: [] }); // Return an empty cart if not found
    }
  
    res.json(userCart.items);
  });
  
  // Checkout (User-specific)
  app.post("/api/checkout", (req, res) => {
    const { mobile } = req.body; // Expect the user's mobile number to be sent
    const cart = readJSON(cartFile);
  
    const updatedCart = cart.filter((c) => c.mobile !== mobile); // Remove user's cart items
    writeJSON(cartFile, updatedCart);
  
    res.json({ message: "Checkout successful." });
  });
  
// Checkout (User)


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const productId = readJSON(productsFile).length ? readJSON(productsFile).length+1:1; // Generates productId based on the current timestamp
    const folder = `uploads/products/${productId}`; // Creates a folder using the productId
    fs.ensureDirSync(folder); // Ensure the folder exists
    req.productId = productId; // Store the productId in the request object
    cb(null, folder); // Define where to store the image
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Create a unique filename
  },
});


const upload = multer({ storage });

// API Endpoints
app.get("/products", (req, res) => res.json(readJSON(productsFile)));



app.post("/products", upload.array("images", 5), (req, res) => {
  const { name, description, quantity, price } = req.body;
  const productId = req.productId;
  const products = readJSON(productsFile);
  // const products = getProducts();
  const images = req.files.map((file) => `/uploads/${file.filename}`);
  const newProduct = { productId: productId, name, description, quantity, price, images };
  // products.push(newProduct);
  // saveProducts(products);.
  writeJSON(productsFile,products);
  console.log('ok');
  res.json(products);
});

app.put("/products/:productId", (req, res) => {
  const { productId } = req.params;
  const { name, description, quantity, price } = req.body;
  
  // const products = getProducts();
  const products = readJSON(productsFile);
  const productIndex = products.findIndex((p) => p.id == id);
  if (productIndex === -1) return res.status(404).json({ error: "Product not found" });

  products[productIndex] = { ...products[productIndex], name, description, quantity, price };
  // saveProducts(products);
  writeJSON(productsFile,products);

  res.json(products[productIndex]);
});


app.delete("/products/:productId", (req, res) => {
  const products = readJSON(productsFile).filter((p) => p.id != req.params.id);
  writeJSON(productsFile,products);
  res.json({ message: "Product deleted" });
});

// Serve React frontend
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});