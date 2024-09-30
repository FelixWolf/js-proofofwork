# Really fast Proof of Work for javascript
Emscripten + Wasm. It is designed to not freeze the browser when doing this by limiting it to 100ms per calculation cycle.
This can be changed in the maxMS class variable.

# Proof of work syntax:
## Calculating on browser:
```js
// Token can be any size, I just used a UUID here.
const token = new Uint8Array([188, 114, 93, 192, 195, 150, 75, 93, 183, 49, 207, 134, 124, 48, 25, 171]);
const difficulty = 4;

ProofOfWork(token, difficulty).then(result=>{
    result.solveAsync().then(e=>{
        console.log("Solved Proof of Work: ", e);
    });
});
```

## Testing on server:
```python
import hashlib
import struct

sPOWFooter = struct.compile(">BI")
def TestProofOfWork(data, difficulty, nonce):
    test = hashlib.sha512(data + sPOWFooter.pack(difficulty, nonce)).hexdigest()
    if test[:difficulty] == "0"*difficulty:
        return True
    return False
```