const axios = require('axios');
const fs = require('fs');
async function scrape() {
  const res = await axios.get('https://bossdoordanang.com.vn/san-pham/');
  fs.writeFileSync('dump.html', res.data);
}
scrape();
