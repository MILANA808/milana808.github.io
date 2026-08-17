/** Wallet connect + demo NFT certificate (honest simulation) */
(function (global) {
  "use strict";
  var state = { address: null, chainId: null };
  function isMetaMask() { return typeof window !== "undefined" && window.ethereum; }
  function connect() {
    if (!isMetaMask()) return Promise.reject(new Error("MetaMask не найден. Демо-сертификат можно выпустить локально."));
    return window.ethereum.request({ method: "eth_requestAccounts" }).then(function (acc) {
      state.address = acc[0];
      return window.ethereum.request({ method: "eth_chainId" }).then(function (id) {
        state.chainId = id; return state;
      });
    });
  }
  function buildMetadata(payload) {
    return {
      name: "AKSI Quantum Certificate #" + (payload.hash || "0000"),
      description: "Локальный сертификат прогона схемы АКСИ MATRIX. Демо ERC-721 метаданных.",
      image: payload.artDataUrl || "",
      attributes: [
        { trait_type: "qubits", value: payload.nQ },
        { trait_type: "gates", value: payload.gatesCount },
        { trait_type: "state_hash", value: payload.hash },
        { trait_type: "did", value: "did:aksi:ed25519:sovereign-2026" }
      ],
      external_url: "https://milana808.github.io/matrix/",
      aksi: { probabilities: payload.probs, dsl: payload.dsl, ts: Date.now() }
    };
  }
  function sha256(text) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }
  function mintDemo(payload) {
    var meta = buildMetadata(payload);
    var raw = JSON.stringify(meta);
    return sha256(raw).then(function (certHash) {
      var cert = {
        demo: true,
        note: "Локальный NFT-сертификат (демо). Не записан в блокчейн, пока вы сами не отправите транзакцию.",
        certHash: certHash,
        address: state.address || "local",
        metadata: meta,
        explorerHint: state.address ? "Кошелёк: " + state.address : "Без кошелька"
      };
      try {
        var list = JSON.parse(localStorage.getItem("aksi_nft_demo") || "[]");
        list.push({ certHash: certHash, ts: Date.now(), hash: payload.hash });
        localStorage.setItem("aksi_nft_demo", JSON.stringify(list.slice(-20)));
      } catch (e) {}
      return cert;
    });
  }
  global.CryptoWallet = { connect: connect, mintDemo: mintDemo, state: state, isMetaMask: isMetaMask };
})(typeof window !== "undefined" ? window : globalThis);
