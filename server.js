/* Máy chủ tĩnh tối giản để chạy Poketto tại http://localhost:3000. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(function (req, res) {
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  // Chuyển hướng thay vì trả thẳng nội dung trang đăng nhập tại "/".
  // Nhờ đó các đường dẫn tương đối như "login.css" và "login.js" được tải đúng.
  if (requestPath === '/') {
    res.writeHead(302, { Location: '/login/login.html' });
    res.end();
    return;
  }
  const relativePath = requestPath.replace(/^[/\\]+/, '');
  const filePath = path.resolve(ROOT, relativePath);

  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Không được phép truy cập tệp này.');
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(err.code === 'ENOENT' ? 'Không tìm thấy trang.' : 'Không thể đọc tệp.');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, function () {
  console.log('Poketto đang chạy tại http://localhost:' + PORT);
});
