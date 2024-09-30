# Add the executable target for the main module
project(main)

set(main_SOURCE_FILES
    sha512.cpp
    main.cpp
)

set(main_HEADER_FILES
    sha512.hpp
    main.h
)


set_source_files_properties(${main_HEADER_FILES} PROPERTIES HEADER_FILE_ONLY TRUE)

list(APPEND main_SOURCE_FILES ${main_HEADER_FILES})

add_executable(${PROJECT_NAME}
    ${main_SOURCE_FILES}
)
set_target_properties(${PROJECT_NAME} PROPERTIES SUFFIX ".wasm")

target_link_options(${PROJECT_NAME} PRIVATE 
    -s
    -Oz
    --no-entry
    --initial-memory=1048576
    --export-dynamic
    -fvisibility=hidden
)

package_files($<TARGET_FILE:main> "")
package_files(${PROJECT_SOURCE_DIR}/index.htm "")
package_files(${PROJECT_SOURCE_DIR}/main.js "")

add_custom_command(TARGET main POST_BUILD
    COMMAND python "${PROJECT_SOURCE_DIR}/packer.py" "$<TARGET_FILE:main>" "${PROJECT_SOURCE_DIR}/main.js" "${CMAKE_CURRENT_SOURCE_DIR}/proofofwork.js"
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    COMMENT "Packing as proofofwork.js"
)
package_files(${PROJECT_SOURCE_DIR}/proofofwork.js "")