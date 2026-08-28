# AKSI Overlay Network (AON)

Application layer **on top of** the public Internet.

## Layers
| L0 | BroadcastChannel | same origin, offline |
| L1 | WebSocket Relay | cross-device |
| L2 | PeerJS WebRTC | direct P2P |

## Protocol AOP/1
Signed envelope with SHA-256 prev-hash chain per room.

```js
AKSI_OVERLAY.createRoom()
AKSI_OVERLAY.joinRoom(id)
AKSI_OVERLAY.chat("hello")
AKSI_OVERLAY.status()
```

Pilot: /net.html
