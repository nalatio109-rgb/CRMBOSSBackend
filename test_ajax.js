const axios = require('axios');
const qs = require('qs');

async function testAjax() {
  const data = {
    action: 'loadmore',
    query: JSON.stringify({"post_type":"product","posts_per_page":16,"order":"DESC"}),
    page: 1
  };
  try {
    const res = await axios.post('https://bossdoordanang.com.vn/wp-admin/admin-ajax.php', qs.stringify(data), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }
    });
    console.log(res.data.substring(0, 500));
  } catch (err) {
    console.error(err.message);
  }
}
testAjax();
