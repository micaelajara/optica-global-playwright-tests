const ROOT_URL = 'https://medusa-storefront-optica.vercel.app';
const BASE_URL = `${ROOT_URL}/ar`;
const PRODUCT_URL = `${BASE_URL}/products/optica-zr6046`;

const STORE_API_URL = 'https://api.opticaglobal.store/store';
const ADMIN_API_URL = 'https://api.opticaglobal.store/admin';

const MEDUSA_PUBLISHABLE_KEY = process.env.MEDUSA_PUBLISHABLE_KEY;

module.exports = { ROOT_URL, BASE_URL, PRODUCT_URL, STORE_API_URL, ADMIN_API_URL, MEDUSA_PUBLISHABLE_KEY };
