(function () {
  var canvas = document.getElementById('pet-canvas');
  var logEl = document.getElementById('log');

  var bus = new EventBus();
  var pet = new Pet(canvas, bus);

  bus.on('pet:dragging', function (d) {
    pet.x += d.dx;
    pet.y += d.dy;
    pet.x = Math.max(0, Math.min(canvas.width - pet.width, pet.x));
    pet.y = Math.max(0, Math.min(canvas.height - pet.height, pet.y));
  });
  bus.on('status:sad', function () { pet.setState('sad', { force: true }); });
  bus.on('status:happy', function () { pet.setState('idle', { force: true }); });

  function log(msg) {
    var t = new Date().toLocaleTimeString();
    logEl.textContent = '[' + t + '] ' + msg + '\n' + logEl.textContent;
  }
  ['pet:stateChange', 'pet:moveEnd', 'pet:clicked',
   'status:played', 'status:fed', 'status:sad', 'status:happy',
   'pet:dragging', 'pet:dragEnd'].forEach(function (ev) {
    bus.on(ev, function (d) {
      log(ev + (d ? ' ' + JSON.stringify(d) : ''));
    });
  });

  var last = performance.now();
  function loop(now) {
    var dt = now - last;
    last = now;
    pet.update(dt);
    pet.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function mk(parent, label, fn) {
    var b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    parent.appendChild(b);
    return b;
  }

  var statesEl = document.getElementById('states');
  var stateBtns = {};
  ['idle', 'walk', 'jump', 'sit', 'yawn', 'sad'].forEach(function (s) {
    stateBtns[s] = mk(statesEl, s, function () { pet.setState(s, { force: true }); });
  });
  bus.on('pet:stateChange', function (d) {
    Object.keys(stateBtns).forEach(function (k) {
      stateBtns[k].classList.toggle('active', k === d.state);
    });
  });
  stateBtns.idle.classList.add('active');

  var typesEl = document.getElementById('types');
  ['cat', 'dog', 'penguin'].forEach(function (t) {
    mk(typesEl, t, function () { pet.setPetType(t); });
  });

  var actEl = document.getElementById('actions');
  mk(actEl, '自动行为 ON', function () { pet.startAutoBehavior(); log('startAutoBehavior'); });
  mk(actEl, '自动行为 OFF', function () { pet.stopAutoBehavior(); log('stopAutoBehavior'); });

  var simEl = document.getElementById('sim');
  mk(simEl, '心情低落(status:sad)', function () { bus.emit('status:sad', { mood: 15 }); });
  mk(simEl, '心情恢复(status:happy)', function () { bus.emit('status:happy', { mood: 90 }); });
  mk(simEl, '清空日志', function () { logEl.textContent = ''; });

  var dragging = false, moved = false, wasDrag = false, lastX = 0, lastY = 0;
  canvas.addEventListener('mousedown', function (e) {
    dragging = true; moved = false; wasDrag = false;
    lastX = e.clientX; lastY = e.clientY;
  });
  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    if (dx || dy) moved = true;
    bus.emit('pet:dragging', { dx: dx, dy: dy });
  });
  window.addEventListener('mouseup', function () {
    if (!dragging) return;
    dragging = false;
    if (moved) {
      wasDrag = true;
      bus.emit('pet:dragEnd', { x: pet.x, y: pet.y });
    }
  });

  canvas.addEventListener('click', function (e) {
    if (wasDrag) { wasDrag = false; return; }
    var r = canvas.getBoundingClientRect();
    var x = e.clientX - r.left, y = e.clientY - r.top;
    pet.jump();
    bus.emit('pet:clicked', { x: x, y: y });
    bus.emit('status:played', { mood: 90 });
  });

  log('预览台就绪：点击/拖拽宠物，或用上方按钮');
})();
