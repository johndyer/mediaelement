# Script to compile the swf files using Flex without Grunt
#
# To compile the swf files, you have to download the Apache Flex SDK version 3.3.2 (only needs to be done once)
#   Download the free Apache Flex SDK from http://flex.apache.org/installer.html
#   Unzip it to a directory on your local machine (eg: /usr/local/apache_flex_sdk_3.3)
#   Create a symlink from the install location to this directory
#   (eg: ln -s /usr/local/apache_flex_sdk_3.3 mediaelement/src/flash)
#
# If you do not have the required player global swc file, you will have to download and add it in flex:
#   https://helpx.adobe.com/flash-player/kb/archived-flash-player-versions.html
#   The file must be placed in apache_flex_sdk_3.3/frameworks/libs/player/32/playerglobal.swc

flex_path="./src/flash/apache_flex_sdk_4.6"
target_version="32"



#in_file="flash-video/VideoElement.as"
#out_file="build/mediaelement-flash-video.swf"
#source_path="./src/flash/flash-video"
#libraries=""
#
# $flex_path/bin/mxmlc -strict=false -compiler.debug -warnings=true ./src/flash/$in_file -o $out_file -library-path+=$flex_path/lib $libraries -use-network=true -target-player $target_version -source-path $source_path -headless-server -static-link-runtime-shared-libraries


# VIDEO
$flex_path/bin/mxmlc -strict=false -compiler.debug=true -warnings=true ./src/flash/flash-video/VideoMediaElement.as -o build/mediaelement-flash-video.swf -library-path+=$flex_path/lib $libraries -use-network=true -target-player $target_version -source-path ./src/flash/flash-video -headless-server -static-link-runtime-shared-libraries

$flex_path/bin/mxmlc -strict=false -compiler.debug=true -warnings=true ./src/flash/flash-video-hls/HlsMediaElement.as -o build/mediaelement-flash-video-hls.swf -library-path+=$flex_path/lib $libraries -use-network=true -target-player $target_version -source-path ./src/flash/flash-video-hls -headless-server -static-link-runtime-shared-libraries -include-libraries+=./src/flash/flash-video-hls/flashls.swc

$flex_path/bin/mxmlc -strict=false -compiler.debug -warnings=true ./src/flash/flash-video-dash/DashMediaElement.as -o build/mediaelement-flash-video-mdash.swf -library-path+=$flex_path/lib $libraries -use-network=true -target-player $target_version -source-path ./src/flash/flash-video-dash -headless-server -static-link-runtime-shared-libraries -include-libraries+=./src/flash/flash-video-dash/OSMF.swc


# AUDIO
$flex_path/bin/mxmlc -strict=false -compiler.debug -warnings=true ./src/flash/flash-audio/AudioMediaElement.as -o build/mediaelement-flash-audio.swf -library-path+=$flex_path/lib $libraries -use-network=true -target-player $target_version -source-path ./src/flash/flash-audio -headless-server -static-link-runtime-shared-libraries

$flex_path/bin/mxmlc -strict=false -compiler.debug -warnings=true ./src/flash/flash-audio-ogg/OggMediaElement.as -o build/mediaelement-flash-audio-ogg.swf -library-path+=$flex_path/lib $libraries -use-network=true -target-player $target_version -source-path ./src/flash/flash-audio-ogg -headless-server -static-link-runtime-shared-libraries -include-libraries+=./src/flash/flash-audio-ogg/oggvorbis.swc
