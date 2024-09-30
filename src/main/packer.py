#!/usr/bin/env python3
import argparse
import gzip

def encode_base95(data):
    BASE = 95
    OFFSET = 32  # ASCII offset for printable characters

    out = []
    buffer = 0
    buffer_size = 0

    for byte in data:
        buffer |= byte << buffer_size
        buffer_size += 8

        while buffer_size >= 6:
            out.append((buffer & 0x3F) + OFFSET)
            buffer >>= 6
            buffer_size -= 6

    if buffer_size > 0:
        out.append((buffer & 0x3F) + OFFSET)

    return out

def decode_base95(encoded):
    BASE = 95
    OFFSET = 32  # ASCII offset for printable characters

    out = bytearray()
    buffer = 0
    buffer_size = 0

    for char in encoded:
        if char < 32:
            continue
        value = char - OFFSET
        buffer |= value << buffer_size
        buffer_size += 6

        while buffer_size >= 8:
            out.append(buffer & 0xFF)
            buffer >>= 8
            buffer_size -= 8

    return bytes(out)

decodeTemplate = """
((encoded)=>{{
    const BASE = 95;
    const OFFSET = 32; // ASCII offset for printable characters

    let out = [];
    let buffer = 0;
    let bufferSize = 0;

    for(let i = 0; i < encoded.length; i++)
    {{
        let value = encoded.charCodeAt(i) - OFFSET;
        if(value < 0) continue;
        buffer |= value << bufferSize;
        bufferSize += 6;

        while(bufferSize >= 8)
        {{
            out.push(buffer & 0xFF);
            buffer >>= 8;
            bufferSize -= 8;
        }}
    }}
    const cs = new DecompressionStream("gzip");
    const writer = cs.writable.getWriter();
    writer.write(new Uint8Array(out));
    writer.close();
    return new Response(cs.readable).arrayBuffer();
}})({ENCODED})
"""

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process some integers.')
    parser.add_argument('inwasm', type=argparse.FileType('rb'))
    parser.add_argument('injs', type=argparse.FileType('r'))
    parser.add_argument('outjs', type=argparse.FileType('w'))

    args = parser.parse_args()
    
    wasm = args.inwasm.read()
    before = len(wasm)
    wasm = gzip.compress(wasm, compresslevel=9)
    print("Compressed input wasm from {} to {}".format(before, len(wasm)))
    
    encoded_data = encode_base95(wasm)
    decoded_data = decode_base95(encoded_data)
    if decoded_data != wasm:
        raise Exception("Failed to encode to base95")
    
    js = args.injs.read()
    if js.find("@@WASMDATA@@") == -1:
        raise Exception("Failed to find @@WASMDATA@@")
    
    js = js.replace("@@WASMDATA@@", decodeTemplate.format(ENCODED="`"+bytes(encoded_data).decode().replace("\\","\\\\").replace("`","\\`")+"`"))
    
    args.outjs.write(js)
