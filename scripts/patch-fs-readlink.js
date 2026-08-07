/**
 * Workaround: On some Windows volumes (e.g. D:), Node 24's fs.readlink*
 * returns EISDIR for regular files. Webpack/Next treat EISDIR as fatal,
 * while EINVAL means "not a symlink" and is recoverable.
 */
const fs = require("fs");

function remap(err) {
  if (err && err.code === "EISDIR") {
    const e = new Error(err.message.replace("EISDIR", "EINVAL"));
    e.code = "EINVAL";
    e.errno = err.errno;
    e.path = err.path;
    e.syscall = err.syscall;
    return e;
  }
  return err;
}

function wrapSync(fn) {
  return function patched(...args) {
    try {
      return fn.apply(this, args);
    } catch (err) {
      throw remap(err);
    }
  };
}

function wrapCallback(fn) {
  return function patched(path, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = undefined;
    }
    return fn.call(this, path, options, (err, result) => {
      callback(err ? remap(err) : null, result);
    });
  };
}

fs.readlinkSync = wrapSync(fs.readlinkSync.bind(fs));
fs.readlink = wrapCallback(fs.readlink.bind(fs));

if (fs.promises && fs.promises.readlink) {
  const orig = fs.promises.readlink.bind(fs.promises);
  fs.promises.readlink = async function patched(...args) {
    try {
      return await orig(...args);
    } catch (err) {
      throw remap(err);
    }
  };
}

console.log("[fs-patch] remapped readlink EISDIR -> EINVAL");
