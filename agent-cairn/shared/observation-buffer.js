// Rolling observation buffer for the Intel Analyst sub-loop.
// Every public channel post and every group message Cairn sees gets pushed here.
// Analyst drains it every 2 hours.

export function createObservationBuffer(limit = 200) {
  const buf = [];

  return {
    push(entry) {
      buf.push(entry);
      if (buf.length > limit) {
        buf.splice(0, buf.length - limit);
      }
    },

    snapshot() {
      return [...buf];
    },

    size() {
      return buf.length;
    },

    clear() {
      buf.length = 0;
    },
  };
}
