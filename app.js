import {
  auth,
  db,
  googleProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "./firebase.js";

const $ = id => document.getElementById(id);

const authSection = $("authSection");
const appSection = $("appSection");
const authMessage = $("authMessage");
const pageContent = $("pageContent");

let currentUser = null;
let currentProfile = null;
let products = [];
let sales = [];

function message(text) {
  authMessage.textContent = text;
}

// CONNEXION AVEC EMAIL
$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  try {
    await signInWithEmailAndPassword(
      auth,
      $("email").value.trim(),
      $("password").value
    );

    message("Connexion réussie.");
  } catch (error) {
    message("Erreur : " + error.message);
  }
});

// CRÉATION DE COMPTE
$("registerBtn").addEventListener("click", async () => {
  try {
    const email = $("email").value.trim();
    const password = $("password").value;

    if (!email || password.length < 6) {
      message("Saisis un email et un mot de passe d'au moins 6 caractères.");
      return;
    }

    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = result.user.uid;

    await setDoc(doc(db, "users", uid), {
      email,
      role: "user",
      approved: false,
      createdAt: serverTimestamp()
    });

    await addDoc(collection(db, "accessRequests"), {
      uid,
      email,
      status: "pending",
      createdAt: serverTimestamp()
    });

    message("Compte créé. En attente de l'approbation de l'administrateur.");

  } catch (error) {
    message("Erreur : " + error.message);
  }
});

// CONNEXION GOOGLE
$("googleBtn").addEventListener("click", async () => {
  try {
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    message("Erreur Google : " + error.message);
  }
});

// RÉCUPÉRATION DU RETOUR GOOGLE
getRedirectResult(auth).catch(error => {
  message("Erreur Google : " + error.message);
});

// DÉCONNEXION
$("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
});

// SURVEILLANCE DE LA CONNEXION
onAuthStateChanged(auth, async user => {
  currentUser = user;

  if (!user) {
    authSection.hidden = false;
    appSection.hidden = true;
    $("logoutBtn").hidden = true;
    return;
  }

  try {
    const profileRef = doc(db, "users", user.uid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      message("Profil utilisateur introuvable.");
      await signOut(auth);
      return;
    }

    currentProfile = profileSnap.data();

    if (currentProfile.approved !== true) {
      message("Votre compte attend l'approbation de l'administrateur.");
      await signOut(auth);
      return;
    }

    authSection.hidden = true;
    appSection.hidden = false;
    $("logoutBtn").hidden = false;

    $("userEmail").textContent = user.email || "";
    $("userRole").textContent =
      currentProfile.role === "admin"
        ? "Administrateur"
        : "Utilisateur autorisé";

    await showDashboard();

  } catch (error) {
    message("Erreur de vérification : " + error.message);
  }
});

// NAVIGATION
document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    const pages = {
      dashboard: showDashboard,
      products: showProducts,
      sales: showSales,
      customers: showCustomers,
      credits: showCredits,
      expenses: showExpenses,
      losses: showLosses,
      suppliers: showSuppliers,
      reports: showReports
    };

    pages[page]();
  });
});

// CHARGEMENT DES PRODUITS
async function loadProducts() {
  const snapshot = await getDocs(collection(db, "products"));
  products = snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));
}

// TABLEAU DE BORD
async function showDashboard() {
  pageContent.innerHTML = `
    <h2>Tableau de bord</h2>
    <p>Bienvenue dans Sarah Stock 2.0.</p>
    <div id="dashboardStats">Chargement...</div>
  `;

  try {
    await loadProducts();

    const snapshot = await getDocs(collection(db, "sales"));
    sales = snapshot.docs.map(item => item.data());

    const today = new Date().toLocaleDateString("fr-FR");

    const todaySales = sales.filter(sale =>
      sale.date === today
    );

    const revenue = todaySales.reduce(
      (sum, sale) => sum + Number(sale.total || 0), 0
    );

    const stock = products.reduce(
      (sum, product) => sum + Number(product.quantity || 0), 0
    );

    $("dashboardStats").innerHTML = `
      <div class="card">
        <h3>Références de boissons</h3>
        <p>${products.length}</p>
      </div>

      <div class="card">
        <h3>Bouteilles en stock</h3>
        <p>${stock}</p>
      </div>

      <div class="card">
        <h3>Ventes du jour</h3>
        <p>${revenue.toLocaleString("fr-FR")} FCFA</p>
      </div>
    `;
  } catch (error) {
    $("dashboardStats").textContent =
      "Impossible de charger les données : " + error.message;
  }
}

// GESTION DES PRODUITS
async function showProducts() {
  pageContent.innerHTML = `
    <h2>Gestion des boissons et du stock</h2>

    <form id="productForm">
      <label>Nom de la boisson</label>
      <input id="productName" required>

      <label>Marque ou format</label>
      <input id="productBrand">

      <label>Bouteilles par casier</label>
      <input id="units" type="number" value="12" min="1" required>

      <label>Quantité en bouteilles</label>
      <input id="quantity" type="number" min="0" required>

      <label>Coût d'achat par bouteille (FCFA)</label>
      <input id="cost" type="number" min="0" required>

      <label>Prix de vente par bouteille (FCFA)</label>
      <input id="price" type="number" min="0" required>

      <button type="submit">Ajouter la boisson</button>
    </form>

    <h3>Liste des boissons</h3>
    <div id="productList">Chargement...</div>
  `;

  await loadProducts();
  renderProducts();

  $("productForm").addEventListener("submit", async event => {
    event.preventDefault();

    try {
      await addDoc(collection(db, "products"), {
        name: $("productName").value.trim(),
        brand: $("productBrand").value.trim(),
        units: Number($("units").value),
        quantity: Number($("quantity").value),
        cost: Number($("cost").value),
        price: Number($("price").value),
        createdAt: serverTimestamp()
      });

      alert("Boisson ajoutée avec succès.");
      showProducts();

    } catch (error) {
      alert("Erreur : " + error.message);
    }
  });
}

function renderProducts() {
  const list = $("productList");

  if (!products.length) {
    list.innerHTML = "<p>Aucune boisson enregistrée.</p>";
    return;
  }

  list.innerHTML = products.map(product => `
    <div class="card">
      <h3>${escapeHTML(product.name)}</h3>
      <p>Marque : ${escapeHTML(product.brand || "-")}</p>
      <p>Stock : ${product.quantity} bouteilles</p>
      <p>Prix bouteille : ${product.price} FCFA</p>
      <button data-delete="${product.id}">Supprimer</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-delete]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!confirm("Supprimer cette boisson ?")) return;

      await deleteDoc(doc(db, "products", button.dataset.delete));
      showProducts();
    });
  });
}

// ENREGISTREMENT DES VENTES
async function showSales() {
  await loadProducts();

  pageContent.innerHTML = `
    <h2>Nouvelle vente</h2>

    <form id="saleForm">
      <label>Boisson</label>
      <select id="saleProduct" required>
        ${products.map(product => `
          <option value="${product.id}">
            ${escapeHTML(product.name)}
          </option>
        `).join("")}
      </select>

      <label>Nombre de bouteilles vendues</label>
      <input id="saleQuantity" type="number" min="1" required>

      <label>Prix de vente par bouteille (FCFA)</label>
      <input id="salePrice" type="number" min="1" required>

      <button type="submit">Enregistrer la vente</button>
    </form>
  `;

  const select = $("saleProduct");

  function updatePrice() {
    const product = products.find(p => p.id === select.value);
    if (product) $("salePrice").value = product.price;
  }

  select.addEventListener("change", updatePrice);
  updatePrice();

  $("saleForm").addEventListener("submit", async event => {
    event.preventDefault();

    const product = products.find(p => p.id === select.value);
    const quantity = Number($("saleQuantity").value);
    const price = Number($("salePrice").value);

    if (!product || quantity <= 0 || price <= 0) return;

    if (quantity > product.quantity) {
      alert("Stock insuffisant.");
      return;
    }

    const total = quantity * price;
    const profit = quantity * (price - product.cost);

    try {
      await updateDoc(doc(db, "products", product.id), {
        quantity: product.quantity - quantity
      });

      await addDoc(collection(db, "sales"), {
        productId: product.id,
        productName: product.name,
        quantity,
        price,
        total,
        profit,
        date: new Date().toLocaleDateString("fr-FR"),
        createdAt: serverTimestamp()
      });

      alert("Vente enregistrée.");
      showDashboard();

    } catch (error) {
      alert("Erreur : " + error.message);
    }
  });
}

// AUTRES RUBRIQUES
function showCustomers() {
  showComingSoon("Gestion des clients");
}

function showCredits() {
  showComingSoon("Crédits et remboursements");
}

function showExpenses() {
  showComingSoon("Gestion des dépenses");
}

function showLosses() {
  showComingSoon("Pertes et bouteilles cassées");
}

function showSuppliers() {
  showComingSoon("Gestion des fournisseurs");
}

function showReports() {
  showComingSoon("Statistiques et rapports");
}

function showComingSoon(title) {
  pageContent.innerHTML = `
    <h2>${title}</h2>
    <p>Ce module sera ajouté dans la prochaine étape de développement.</p>
  `;
}

function escapeHTML(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}// INSTALLATION DU SERVICE WORKER
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then(() => {
        console.log("Sarah Stock : mode hors connexion activé.");
      })
      .catch(error => {
        console.error("Erreur service worker :", error);
      });
  });
}

