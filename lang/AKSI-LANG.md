# AKSI Language v1

```aksi
agent Sovereign {
  on query(q) {
    let qx = quantum.shot(q)
    let ans = brain.think(q)
    return ans
  }
}
```

Builtins: quantum.shot, brain.think, trust.verify, hash, print, remember, recall
Runtime: aksi-lang.js on milana808.github.io
