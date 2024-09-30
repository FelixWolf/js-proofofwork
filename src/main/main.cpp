#include <emscripten.h>
#include "sha512.hpp"
#define EXPORT EMSCRIPTEN_KEEPALIVE extern "C" 


EXPORT int allocate(int size)
{
    return (int)malloc(size);
}

EXPORT void unallocate(int ptr)
{
    return free((void*)ptr);
}

// Exported function to initialize the proof-of-work state
EXPORT int ProofOfWork_init(int data, int length)
{
    // Allocate memory for the SHA-512 state
    sha512_state* md = new sha512_state;
    sha_init(*md);
    sha_process(*md, (const void*)data, length); // Use 'length' instead of 'len'
    return (int)md; // Return pointer as an integer
}

// Exported function to perform a proof-of-work cycle
EXPORT int ProofOfWork_cycle(int md_ptr, int difficulty, int start, int count)
{
    // Cast md_ptr back to sha512_state pointer
    sha512_state* md = (sha512_state*)md_ptr;

    // Prepare a buffer to hold the integer data as bytes
    unsigned char data[5];
    data[0] = difficulty & 0xFF; // Difficulty should never be this high, but guard against it
    unsigned char hash[64];

    for(unsigned int i = start, l = start + count; i < l; i++)
    {
        // Turn the integer 'i' into a byte array
        data[1] = (i >> 24) & 0xFF; // Most significant byte
        data[2] = (i >> 16) & 0xFF;
        data[3] = (i >> 8) & 0xFF;
        data[4] = i & 0xFF; // Least significant byte

        // Create a copy of the md state before processing
        sha512_state md_copy = *md;

        // Add our int to the copied md
        sha_process(md_copy, (const void*)data, sizeof(data)); // Use sizeof to ensure correct length

        // Check if the resulting hash meets the difficulty requirement// Buffer to hold the hash output
        sha_done(md_copy, hash);

        // Check the hash for leading zeros according to the difficulty
        bool valid = true;
        for(unsigned int j = 0; j < difficulty; j++)
        {
            // Alternate between the two nibbles and confirm they are zeros
            if(
                ((j & 1) == 0 && (hash[j >> 1] & 0x0F) != 0) ||
                ((j & 1) == 1 && (hash[j >> 1] & 0xF0) != 0)
            )
            {
                valid = false;
                break; // Exit the loop if any condition fails
            }
        }
        if (valid)
        {
            // We found a matching number, return it
            return i;
        }
    }
    // If no valid nonce found, return -1
    return -1;
}

EXPORT void ProofOfWork_finish(int md)
{
    // Cast md back to sha512_state pointer and free the allocated memory
    sha512_state* state = (sha512_state*)md;
    delete state;  // Free the allocated sha512_state memory
}
/*
EXPORT int sha512_init()
{
    sha512_state* md = new sha512_state;  // Corrected the pointer declaration
    sha_init(*md);  // Assuming sha_init takes a reference, dereference md
    return (int)md;  // Cast the pointer to int (though this is unsafe; better to return a pointer in real use)
}

EXPORT void sha512_update(int md, int data, int len)
{
    sha_process(*(sha512_state*)md, (const void*)data, len);  // Dereference the pointer cast from int to sha512_state*
}

EXPORT int sha512_finish(int md)
{
    void *out = malloc(64);  // 512 bits is 64 bytes, so allocate 64 bytes for the output
    sha_done(*(sha512_state*)md, out);  // Finalize the SHA512 and write the result to 'out'
    delete (sha512_state*)md;  // Free the allocated sha512_state memory
    return (int)out;  // Return the output as an int (representing a pointer)
}
*/