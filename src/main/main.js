(()=>{
    async function init()
    {
        const { instance } = await WebAssembly.instantiate(
            await @@WASMDATA@@, {}
        );
        //int allocate(int size)
        //void unallocate(int ptr)
        //int ProofOfWork_init(int data, int length)
        //int ProofOfWork_cycle(int md_ptr, int difficulty, int start, int end)
        //void ProofOfWork_finish(int md)
        //int sha512_init()
        //void sha512_update(int md, int data, int len)
        //int sha512_finish(int md)
        function malloc(size)
        {
            const ptr = instance.exports.allocate(size);
            return new Uint8Array(instance.exports.memory.buffer).subarray(ptr, ptr + size);
        }
        
        function free(ptr)
        {
            instance.exports.unallocate(ptr.byteOffset);
        }
        
        function hash(input)
        {
            const indata = malloc(1024);
            const md = instance.exports.sha512_init();
            for(let i = 0; i < input.byteLength; i += 1024)
            {
                let remainder = (input.byteLength - i)&0x3ff;
                indata.set(input.subarray(i, i + remainder));
                instance.exports.sha512_update(md, indata.byteOffset, remainder);
            }
            free(indata);
            const outptr = instance.exports.sha512_finish(md);
            const res = new Uint8Array(64);
            res.set(
                new Uint8Array(instance.exports.memory.buffer).subarray(outptr, outptr+64)
            );
            free(outptr);
            return res;
        }
        
        class ProofOfWork
        {
            value = -1;
            maxMS = 75;
            constructor(token, difficulty = 1, index = 0)
            {
                this.token = token; // Token we check against
                this.difficulty = difficulty; // Difficulty level
                this.index = index; // Current offset
                
                // Upload into memory
                const indata = malloc(token.byteLength);
                indata.set(token);
                this.md = instance.exports.ProofOfWork_init(indata.byteOffset, token.byteLength);
                free(indata);
            }
            
            cycle(start, count)
            {
                if(this.value >= 0)
                    return this.value;
                
                const test = instance.exports.ProofOfWork_cycle(this.md, this.difficulty, start, count);
                if(test >= 0)
                {
                    this.value = test;
                    this.finish();
                }
                return test;
            }
            
            #promises = [];
            #solving = false;
            #stepSize = 1000;
            #solveAsync()
            {
                if(this.#solving) return;
                this.#solving = true;
                let self = this;
                function loop()
                {
                    const start = performance.now();
                    const test = self.cycle(self.index, self.#stepSize);
                    const duration = performance.now() - start;
                    self.index += self.#stepSize;
                    
                    if(duration > self.maxMS)
                        self.#stepSize -= 1000;
                    else if(duration < self.maxMS)
                        self.#stepSize += 1000;
                    
                    if(test >= 0)
                    {
                        self.#solving = false;
                        for(let promise of self.#promises)
                            promise(test);
                    }
                    else
                        setTimeout(function(){
                            loop();
                        }, 0);
                }
                loop();
            }
            
            solveAsync()
            {
                const self = this;
                if(this.value >= 0)
                    new Promise((resolve)=>{
                        return self.value;
                    });
                
                const p = new Promise((resolve)=>{
                    self.#promises.push(resolve);
                });
                this.#solveAsync();
                return p;
            }
            
            finish()
            {
                if(this.md)
                    instance.exports.ProofOfWork_finish(this.md);
                this.md = false;
            }
        }
        
        return ProofOfWork;
    }
    const promises = [];
    window.ProofOfWork = function()
    {
        const args = arguments;
        return new Promise((resolve)=>{
            promises.push([resolve, args])
        });
    };
    init().then(function(hasher)
    {
        window.ProofOfWork = function()
        {
            const args = arguments;
            return new Promise((resolve)=>{
                resolve(new hasher(...args));
            });
        };
        const self = this;
        for(let promise of promises)
            promise[0](new hasher(...promise[1]));
    });
})();