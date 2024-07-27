// Copyright (c) 2021 Liam Norman
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the The GNU Affero General Public
// License as published by the Free Software Foundation; either
// version 3 of the License, or (at your option) any later version.
//
// You should have received a copy of the GNU Affero General Public
// License along with this library; if not, write to the Free Software
// Foundation, 51 Franklin Street, Suite 500 Boston, MA 02110-1335 USA

/*
   global

   _, docById, DOUBLEFLAT, FLAT, NATURAL, SHARP, DOUBLESHARP,
   CUSTOMSAMPLES, wheelnav, getVoiceSynthName, Singer, DRUMS, Tone,
   instruments, slicePath, platformColor
*/

/* exported SampleWidget */
/**
 * Represents a Sample Widget.
 * @constructor
 */
function AIWidget() {
    const ICONSIZE = 32;
    const SAMPLEWIDTH = 800;
    const SAMPLEHEIGHT = 400;
    // Don't include natural when construcing the note name...
    const EXPORTACCIDENTALNAMES = [DOUBLEFLAT, FLAT, "", SHARP, DOUBLESHARP];
    // ...but display it in the selector.
    const ACCIDENTALNAMES = [DOUBLEFLAT, FLAT, NATURAL, SHARP, DOUBLESHARP];
    const SOLFEGENAMES = ["do", "re", "mi", "fa", "sol", "la", "ti", "do"];
    const PITCHNAMES = ["C", "D", "E", "F", "G", "A", "B"];
    const MAJORSCALE = [0, 2, 4, 5, 7, 9, 11];
    const REFERENCESAMPLE = "electronic synth";
    const DEFAULTSAMPLE = "electronic synth";
    const CENTERPITCHHERTZ = 220;
    const SAMPLEWAITTIME = 500;

    // Oscilloscope constants
    const SAMPLEANALYSERSIZE = 8192;
    const SAMPLEOSCCOLORS = ["#3030FF", "#FF3050"];
    let abcNotationSong=""
    var midiBuffer
    /**
     * Reference to the timbre block.
     * @type {number | null}
     */
    this.timbreBlock;

    /**
     * Array to store sample-related data.
     * @type {Array}
     */
    this.sampleArray;

    /**
     * String representing sample data.
     * @type {string}
     */
    this.sampleData = "";

    /**
     * Name of the sample.
     * @type {string}
     */
    this.sampleName = DEFAULTSAMPLE;
    /**
     * Contains ABC notation generated song from the LLM
     * @type {string}
     */
    

    /**
     * Pitch of the sample.
     * @type {string}
     */
    this.samplePitch = "sol";

    /**
     * Octave of the sample.
     * @type {string}
     */
    this.sampleOctave = "4";

    /**
     * Pitch center.
     * @type {number}
     */
    this.pitchCenter = 9;

    /**
     * Accidental center.
     * @type {number}
     */
    this.accidentalCenter = 2;

    /**
     * Octave center.
     * @type {number}
     */
    this.octaveCenter = 4;

     /**
     * Sample length.
     * @type {number}
     */
    this.sampleLength = 1000;

    /**
     * Pitch analyzers.
     * @type {object}
     */
    this.pitchAnalysers = {};

    /**
     * Updates the blocks related to the sample.
     * @private
     * @returns {void}
     */
    this._updateBlocks = function () {
        let mainSampleBlock;
        let audiofileBlock;
        let solfegeBlock;
        let octaveBlock;
        this.sampleArray = [this.sampleName, this.sampleData, this.samplePitch, this.sampleOctave];
        if (this.timbreBlock != null) {
            mainSampleBlock = this.activity.blocks.blockList[this.timbreBlock].connections[1];
            if (mainSampleBlock != null) {
                this.activity.blocks.blockList[mainSampleBlock].value = this.sampleArray;
                this.activity.blocks.blockList[mainSampleBlock].updateCache();
                audiofileBlock = this.activity.blocks.blockList[mainSampleBlock].connections[1];
                solfegeBlock = this.activity.blocks.blockList[mainSampleBlock].connections[2];
                octaveBlock = this.activity.blocks.blockList[mainSampleBlock].connections[3];
                if (audiofileBlock != null) {
                    this.activity.blocks.blockList[audiofileBlock].value = [
                        this.sampleName,
                        this.sampleData
                    ];
                    this.activity.blocks.blockList[audiofileBlock].text.text = this.sampleName;
                    this.activity.blocks.blockList[audiofileBlock].updateCache();
                }
                if (solfegeBlock != null) {
                    this.activity.blocks.blockList[solfegeBlock].value = this.samplePitch;
                    this.activity.blocks.blockList[solfegeBlock].text.text = this.samplePitch;
                    this.activity.blocks.blockList[solfegeBlock].updateCache();
                }
                if (octaveBlock != null) {
                    this.activity.blocks.blockList[octaveBlock].value = this.sampleOctave;
                    this.activity.blocks.blockList[octaveBlock].text.text = this.sampleOctave;
                    this.activity.blocks.blockList[octaveBlock].updateCache();
                }

                this.activity.refreshCanvas();
                this.activity.saveLocally();
            }
        }
    };
    
    /**
     * Pauses the sample playback.
     * @returns {void}
     */
    this.pause = function () {
        midiBuffer.stop()
    };

    /**
     * Resumes the sample playback.
     * @returns {void}
     */
    this.resume = function () {
        this.playBtn.innerHTML =
            '<img src="header-icons/pause-button.svg" title="' +
            _("Pause") +
            '" alt="' +
            _("Pause") +
            '" height="' +
            ICONSIZE +
            '" width="' +
            ICONSIZE +
            '" vertical-align="middle">';
        this.isMoving = true;
    };

    /**
     * Sets the pitch center for the sample.
     * @param {string} p - The pitch to set as the center.
     * @returns {void}
     */
    this._usePitch = function (p) {
        const number = SOLFEGENAMES.indexOf(p);
        this.pitchCenter = number == -1 ? 0 : number;
    };

    /**
     * Sets the accidental center for the sample.
     * @param {string} a - The accidental to set as the center.
     * @returns {void}
     */
    this._useAccidental = function (a) {
        const number = ACCIDENTALNAMES.indexOf(a);
        this.accidentalCenter = number === -1 ? 2 : number;
    };

    /**
     * Sets the octave center for the sample.
     * @param {string} o - The octave to set as the center.
     * @returns {void}
     */
    this._useOctave = function (o) {
        this.octaveCenter = parseInt(o);
    };

    /**
     * Gets the length of the sample and displays a warning if it exceeds 1MB.
     * @returns {void}
     */
    this.getSampleLength = function () {
        if (this.sampleData.length > 1333333) {
            this.activity.errorMsg(_("Warning: Sample is bigger than 1MB."), this.timbreBlock);
        }
    };
    function adjustPitch(note, keySignature) {
        const accidental = keySignature.accidentals.find(acc => {
            const noteToCompare = acc.note.toUpperCase().replace(',', '');
            note = note.replace(',', '');
            return noteToCompare.toLowerCase() === note.toLowerCase();
        });
    
        if (accidental) {
            return note + (accidental.acc === "sharp" ? "♯" : (accidental.acc === "flat" ? "♭" : ""));
        } else {
            return note;
        }
    }
    //when converting to pitch value from abc to mb there is issue with the pithc standard comming out to be odd, using below function map the pitch to audible pitch
    function abcToStandardValue(pitchValue) {
       
        
        const octave = Math.floor(pitchValue/ 7) + 4; 
        return  octave;
    }
    //creates  pitch which consist of note pitch notename you could see them in the function
    function createPitchBlocks(pitches, blockId, pitchDuration,keySignature,actionBlock,triplet,meterDen) {
        const blocks = [];
        
        const pitch = pitches;
        pitchDuration = toFraction(pitchDuration);          
        const adjustedNote = adjustPitch(pitch.name , keySignature).toUpperCase();
        if(triplet!==undefined&&triplet!==null){
            console.log('For the Pitch')
            console.log(pitch)
            console.log('below is the meter Den')
            console.log(meterDen);
            console.log('below is the triplet')
            console.log(triplet)
            pitchDuration[1]=meterDen*triplet
        }
      
        actionBlock.push(
            
            [blockId, ["newnote", {"collapsed": true}], 0, 0, [blockId - 1, blockId + 1, blockId + 4, blockId + 8]],
            [blockId + 1, "divide", 0, 0, [blockId, blockId + 2, blockId + 3]],
            [blockId + 2, ["number", {value: pitchDuration[0]}], 0, 0, [blockId + 1]],
            [blockId + 3, ["number", {value: pitchDuration[1]}], 0, 0, [blockId + 1]],
            [blockId + 4, "vspace", 0, 0, [blockId, blockId + 5]],
            [blockId + 5, "pitch", 0, 0, [blockId + 4, blockId + 6, blockId + 7, null]],
            [blockId + 6, ["notename", {value: adjustedNote}], 0, 0, [blockId + 5]],
            [blockId + 7, ["number", {value: abcToStandardValue(pitch.pitch)}], 0, 0, [blockId + 5]],
            [blockId + 8, "hidden", 0, 0, [blockId, blockId + 9]],
        );

  
    
        return blocks;
    }

    //function to search index for particular type of block mainly used to find nammeddo block in repeat block
    function searchIndexForMusicBlock(array, x) {
        // Iterate over each sub-array in the main array
        for (let i = 0; i < array.length; i++) {
            // Check if the 0th element of the sub-array matches x
            if (array[i][0] === x) {
                // Return the index if a match is found
                return i;
            }
        }
        // Return -1 if no match is found
        return -1;
    }

    this._parseABC = async function (tune) {
        let musicBlocksJSON = [];
        
        let staffBlocksMap = {};
        let organizeBlock={}
        let blockId = 0;

        let tripletFinder = null
        const title = (tune.metaText?.title ?? "title").toString().toLowerCase();
        const instruction = (tune.metaText?.instruction ?? "guitar").toString().toLowerCase();
        

        tune.lines?.forEach(line => {
            console.log(line );
            line.staff?.forEach((staff,staffIndex) => {
                
                if (!organizeBlock.hasOwnProperty(staffIndex)) {
                    organizeBlock[staffIndex] = {
                     arrangedBlocks:[]
                    };
               
                }

               organizeBlock[staffIndex].arrangedBlocks.push(staff)
    

            });
        });
        console.log('below is the arranged blocks')
        console.log(organizeBlock)
        for (const lineId in organizeBlock) {
            organizeBlock[lineId].arrangedBlocks?.forEach((staff) => {
                if (!staffBlocksMap.hasOwnProperty(lineId)) {
                    staffBlocksMap[lineId] = {
                        meterNum: staff?.meter?.value[0]?.num || 4,
                        meterDen: staff?.meter?.value[0]?.den || 4,
                        keySignature: staff.key,
                        baseBlocks: [],
                        startBlock: [
                            [blockId, ["start", {collapsed: false}], 100, 100, [null, blockId + 1, null]],
                            [blockId + 1, "print", 0, 0, [blockId, blockId + 2, blockId + 3]],
                            [blockId + 2, ["text", {value: title}], 0, 0, [blockId + 1]],
                            [blockId + 3, "setturtlename2", 0, 0, [blockId + 1, blockId + 4, blockId + 5]],
                            [blockId + 4, ["text", {value: `Voice ${parseInt(lineId)+1 } `}], 0, 0, [blockId + 3]],
                            [blockId + 5, "meter", 0, 0, [blockId + 3, blockId + 6, blockId + 7, blockId + 10]],
                            [blockId + 6, ["number", {value: staff?.meter?.value[0]?.num || 4}], 0, 0, [blockId + 5]],
                            [blockId + 7, "divide", 0, 0, [blockId + 5, blockId + 8, blockId + 9]],
                            [blockId + 8, ["number", {value: 1}], 0, 0, [blockId + 7]],
                            [blockId + 9, ["number", {value:  staff?.meter?.value[0]?.den || 4}], 0, 0, [blockId + 7]],
                            [blockId + 10, "vspace", 0, 0, [blockId + 5, blockId + 11]],
                            [blockId + 11, "setkey2", 0, 0, [blockId + 10, blockId + 12, blockId + 13, blockId + 14]],
                            [blockId + 12, ["notename", {value: staff.key.root}], 0, 0, [blockId + 11]],
                            [blockId + 13, ["modename", {value: staff.key.mode == "m" ? "minor" : "major"}], 0, 0, [blockId + 11]],
                            //In Settimbre instead of null it should be nameddoblock of first action block
                            [blockId + 14, "settimbre", 0, 0, [blockId + 11, blockId + 15, null, blockId + 16]],
                            [blockId + 15, ["voicename", {value: instruction}], 0, 0, [blockId + 14]],
                            [blockId + 16, "hidden", 0, 0, [blockId + 14, null]]
                        ],
                        repeatBlock:[],
                        repeatArray:[],
                        nameddoArray:{},
                    };
            
                 

                    //for adding above 17 blocks above 
                    blockId=blockId+17
                }

                let actionBlock=[]
                staff.voices.forEach(voice => {
                    console.log(voice)
                 
              
                    voice.forEach(element => {
                        console.log('hello');
                        if (element.el_type === "note") {
                            //check if triplet exists 
                            if (element?.startTriplet !== null&&element?.startTriplet !== undefined) {
                                tripletFinder = element.startTriplet;
                            }
                            
                            // Check and set tripletFinder to null if element?.endTriplets exists
                      
                            console.log('pitches are below')
                            console.log(element)
                            createPitchBlocks(element.pitches[0], blockId,element.duration,staff.key,actionBlock,tripletFinder,staffBlocksMap[lineId].meterDen);
                            if (element?.endTriplet!== null &&element?.endTriplet!== undefined) {
                                tripletFinder = null;
                            }
                            blockId = blockId + 9;
                        }

                        //check repeat start and end block 
                        else if(element.el_type==="bar"){
                            if(element.type==="bar_left_repeat"){
                                staffBlocksMap[lineId].repeatArray.push({start : staffBlocksMap[lineId].baseBlocks.length ,end:-1})
                            }
                            else if (element.type ==="bar_right_repeat"){
                                const endBlockSearch =    staffBlocksMap[lineId].repeatArray

                                for(const repeatbar in endBlockSearch){
                                    console.log('endBlockSearch[repeatbar].end'+ endBlockSearch[repeatbar].end)
                                    if(endBlockSearch[repeatbar].end==-1){
                                        staffBlocksMap[lineId].repeatArray[repeatbar].end=staffBlocksMap[lineId].baseBlocks.length
                                    }
                                }                     

                            }

                        }
                    });
                    
                    //update the newnote connection with hidden
                    actionBlock[0][4][0]=blockId+3
                     actionBlock[actionBlock.length-1][4][1]=null
                    
                        //update the namedo block if not first nameddo block appear
                    if(staffBlocksMap[lineId].baseBlocks.length!=0){                          
                    staffBlocksMap[lineId].baseBlocks[staffBlocksMap[lineId].baseBlocks.length - 1][0][staffBlocksMap[lineId].baseBlocks[staffBlocksMap[lineId].baseBlocks.length - 1][0].length-4][4][1] =blockId
                    }   
                    //add the nameddo action text and hidden block for each line
                    actionBlock.push ( [blockId, ["nameddo", {value: `V: ${parseInt(lineId)+1} Line ${staffBlocksMap[lineId]?.baseBlocks?.length + 1}`}], 0, 0, [staffBlocksMap[lineId].baseBlocks.length === 0 ? null : staffBlocksMap[lineId].baseBlocks[staffBlocksMap[lineId].baseBlocks.length - 1][0][staffBlocksMap[lineId].baseBlocks[staffBlocksMap[lineId].baseBlocks.length - 1][0].length-4][0], null]],
                    [blockId + 1, ["action", {collapsed: false}], 100, 100, [null, blockId + 2, blockId + 3, null]],
                    [blockId + 2, ["text", {value: `V: ${parseInt(lineId)+1} Line ${staffBlocksMap[lineId]?.baseBlocks?.length + 1}`}], 0, 0, [blockId + 1]],
                    [blockId + 3, "hidden", 0, 0, [blockId + 1, actionBlock[0][0]]] )// blockid of topaction block
                    
                    if (!staffBlocksMap[lineId].nameddoArray) {
                        staffBlocksMap[lineId].nameddoArray = {};
                    }
                    
                    // Ensure the array at nameddoArray[lineId] is initialized if it doesn't exist
                    if (!staffBlocksMap[lineId].nameddoArray[lineId]) {
                        staffBlocksMap[lineId].nameddoArray[lineId] = [];
                    }
                    
                    staffBlocksMap[lineId].nameddoArray[lineId].push(blockId);
                    blockId=blockId+4

                    musicBlocksJSON.push(actionBlock)

                    console.log('below is the repeat checker'+lineId)
                    staffBlocksMap[lineId].baseBlocks.push([actionBlock]);
                 

                });

            });
        }
     
        let finalBlock = [];
        console.log('below is the staff Block map')
        console.log(staffBlocksMap)


        //Some Error are here need to be fixed 
        for (const staffIndex in staffBlocksMap) {
            
            
            
            staffBlocksMap[staffIndex].startBlock[staffBlocksMap[staffIndex].startBlock.length - 3][4][2] = staffBlocksMap[staffIndex].baseBlocks[0][0][staffBlocksMap[staffIndex].baseBlocks[0][0].length - 4][0];
            

        
            // Update the first namedo block with settimbre
            staffBlocksMap[staffIndex].baseBlocks[0][0][staffBlocksMap[staffIndex].baseBlocks[0][0].length - 4][4][0] = staffBlocksMap[staffIndex].startBlock[staffBlocksMap[staffIndex].startBlock.length - 3][0];
        
            console.log(`For iter ${staffIndex}`);
            console.log(staffBlocksMap[staffIndex].baseBlocks[0][0][staffBlocksMap[staffIndex].baseBlocks[0][0].length - 4]);
        

            let repeatBlock =[]
    
            let repeatblockids=staffBlocksMap[staffIndex].repeatArray
            for(const repeatId of repeatblockids){
                if (repeatId.start==0){
                    
                    
                    
                    staffBlocksMap[staffIndex].repeatBlock.push([blockId,"repeat",0,0,[ staffBlocksMap[staffIndex].startBlock[staffBlocksMap[staffIndex].startBlock.length - 3][0]/*setribmre*/,blockId+1,staffBlocksMap[staffIndex].nameddoArray[staffIndex][0],staffBlocksMap[staffIndex].nameddoArray[staffIndex][repeatId.end+1] === null ? null :staffBlocksMap[staffIndex].nameddoArray[staffIndex][repeatId.end+1]]])
                    staffBlocksMap[staffIndex].repeatBlock.push([blockId + 1, ["number", {value: 2}], 100, 100, [blockId]])

                    //Update the settrimbre block
                    staffBlocksMap[staffIndex].startBlock[staffBlocksMap[staffIndex].startBlock.length - 3][4][2]=blockId
                    console.log('Following are the nameddo Array')
                    console.log(staffBlocksMap[staffIndex].nameddoArray)
                    let firstnammedo=searchIndexForMusicBlock(staffBlocksMap[staffIndex].baseBlocks[0][0],staffBlocksMap[staffIndex].nameddoArray[staffIndex][0])
                    let endnammedo = searchIndexForMusicBlock(staffBlocksMap[staffIndex].baseBlocks[repeatId.end][0],staffBlocksMap[staffIndex].nameddoArray[staffIndex][repeatId.end])
                    console.log('below is the firstnammedo')
                    console.log( firstnammedo)  
                    console.log('below and below is the error for you ')
                    
                    console.log(staffBlocksMap[staffIndex].baseBlocks[0][0])
                    //because its [0]is the first nammeddo block obviously

                    // Check if staffBlocksMap[staffIndex].baseBlocks[repeatId.end+1] exists and has a [0] element
                if (staffBlocksMap[staffIndex].baseBlocks[repeatId.end + 1] && staffBlocksMap[staffIndex].baseBlocks[repeatId.end + 1][0]) {
                    let secondnammedo = searchIndexForMusicBlock(
                        staffBlocksMap[staffIndex].baseBlocks[repeatId.end + 1][0], 
                        staffBlocksMap[staffIndex].nameddoArray[staffIndex][repeatId.end + 1]
                    );

                    if (secondnammedo != -1) {
                        staffBlocksMap[staffIndex].baseBlocks[repeatId.end + 1][0][secondnammedo][4][0] = blockId;
                    }
                }
                staffBlocksMap[staffIndex].baseBlocks[0][0][firstnammedo][4][0]=blockId
                staffBlocksMap[staffIndex].baseBlocks[repeatId.end][0][endnammedo][4][1]=null

                blockId=blockId+2
            
                }
                else{
           
                  
                
                    const currentnammeddo =searchIndexForMusicBlock(staffBlocksMap[staffIndex].baseBlocks[repeatId.start][0],staffBlocksMap[staffIndex].nameddoArray[staffIndex][repeatId.start])

                    let prevnameddo = searchIndexForMusicBlock(staffBlocksMap[staffIndex].baseBlocks[repeatId.start-1][0],staffBlocksMap[staffIndex].baseBlocks[repeatId.start][0][currentnammeddo][4][0])
                    let afternamedo = searchIndexForMusicBlock(staffBlocksMap[staffIndex].baseBlocks[repeatId.end][0],staffBlocksMap[staffIndex].baseBlocks[repeatId.start][0][currentnammeddo][4][1])
                    let prevrepeatnameddo=-1
                    if(prevnameddo==-1){
                        prevrepeatnameddo = searchIndexForMusicBlock(staffBlocksMap[staffIndex].repeatBlock,staffBlocksMap[staffIndex].baseBlocks[repeatId.start][0][currentnammeddo][4][0])
                    }
                    
              
                    const prevBlockId=staffBlocksMap[staffIndex].baseBlocks[repeatId.start][0][currentnammeddo][4][0]
                    console.log('prevBlockID')
                    console.log(prevBlockId)
                    const currentBlockId=staffBlocksMap[staffIndex].baseBlocks[repeatId.start][0][currentnammeddo][0]

                    //needs null checking optmizie
                let nextBlockId=staffBlocksMap[staffIndex].nameddoArray[staffIndex][repeatId.end+1]
                
                  staffBlocksMap[staffIndex].repeatBlock.push([blockId,"repeat",0,0,[staffBlocksMap[staffIndex].baseBlocks[repeatId.start][0][currentnammeddo][4][0],blockId+1, currentBlockId,nextBlockId === null ? null : nextBlockId]])
                  staffBlocksMap[staffIndex].repeatBlock.push([blockId + 1, ["number", {value: 2}], 100, 100, [blockId]])

               if(prevnameddo!=-1){
                staffBlocksMap[staffIndex].baseBlocks[repeatId.start-1][0][prevnameddo][4][1]=blockId
               }else{
                staffBlocksMap[staffIndex].repeatBlock[prevrepeatnameddo][4][3]=blockId
               }
               if(afternamedo!=-1){
                staffBlocksMap[staffIndex].baseBlocks[repeatId.end][0][afternamedo][4][1]=null
               }
                

                staffBlocksMap[staffIndex].baseBlocks[repeatId.start][0][currentnammeddo][4][0]=blockId
               
                if(nextBlockId!=null){
                    console.log('below is the repeat next block id '+ repeatId)
                    console.log(staffBlocksMap[staffIndex].baseBlocks)
                    const nextnameddo = searchIndexForMusicBlock(staffBlocksMap[staffIndex].baseBlocks[repeatId.end+1][0],nextBlockId)
                    staffBlocksMap[staffIndex].baseBlocks[repeatId.end+1][0][nextnameddo][4][0]=blockId
                }
             
     
                blockId=blockId+2
                }
                    
                }
               
                let lineBlock = staffBlocksMap[staffIndex].baseBlocks.reduce((acc, curr) => acc.concat(curr), []);
                let flattenedLineBlock = lineBlock.flat(); // Flatten the multidimensional array
                let combinedBlock = [...staffBlocksMap[staffIndex].startBlock, ...flattenedLineBlock];
            
                finalBlock.push(...staffBlocksMap[staffIndex].startBlock);
                finalBlock.push(...flattenedLineBlock);
                finalBlock.push(...staffBlocksMap[staffIndex].repeatBlock)
                console.log('Below is the combined block:');
                console.log(combinedBlock);
            }
            
        
       
        

        console.log('below is the staff Block map')
        console.log(staffBlocksMap);

        
        console.log('test block is ')
        console.log(finalBlock)

      this.activity.blocks.loadNewBlocks(finalBlock);
  

  this.activity.textMsg(_("A new sample block was generated."));

        // // logo.textMsg(_("MIDI loading. This may take some time depending upon the number of notes in the track"));
        // this.blocks.loadNewBlocks(combined_array);
        return null;

    }
    /**
     * Displays an error message when the uploaded sample is not a .wav file.
     * @returns {void}
     */
    this.showSampleTypeError = function () {
        this.activity.errorMsg(_("Upload failed: Sample is not a .wav file."), this.timbreBlock);
    };
   
    /**
     * Saves the sample and generates a new sample block with the provided data.
     * @private
     * @returns {void}
     */
    this.__save = function () {
        const tunebook = new ABCJS.parseOnly(abcNotationSong);
        console.log(tunebook)
        tunebook.forEach(tune => {
            //call parseABC to parse abcdata to MB json
            this._parseABC(tune);
            console.log(tune)
        
        });
        
    };

    /**
     * Saves the sample.
     * @private
     * @returns {void}
     */
    this._saveSample = function () {
        this.__save();
    };

    /**
     * Gets the status of the save lock.
     * @private
     * @returns {boolean} The status of the save lock.
     */
    this._get_save_lock = function () {
        return this._save_lock;
    };

    /**
     * Initializes the Sample Widget.
     * @param {object} activity - The activity object.
     * @returns {void}
     */
    this.init = function (activity) {
        this.activity = activity;
        this._directions = [];
        this._widgetFirstTimes = [];
        this._widgetNextTimes = [];
        this._firstClickTimes = null;
        this.isMoving = false;
        this.pitchAnalysers = {};

        this.activity.logo.synth.loadSynth(0, getVoiceSynthName(DEFAULTSAMPLE));
        this.reconnectSynthsToAnalyser();

        this.pitchAnalysers = {};

        this.running = true;
        if (this.drawVisualIDs) {
            for (const id of Object.keys(this.drawVisualIDs)) {
                cancelAnimationFrame(this.drawVisualIDs[id]);
            }
        }

        this.drawVisualIDs = {};
        const widgetWindow = window.widgetWindows.windowFor(this, "AI");
        this.widgetWindow = widgetWindow;
        this.divisions = [];
        widgetWindow.clear();
        widgetWindow.show();

        // For the button callbacks
        var that = this;

        widgetWindow.onclose = () => {
            if (this.drawVisualIDs) {
                for (const id of Object.keys(this.drawVisualIDs)) {
                    cancelAnimationFrame(this.drawVisualIDs[id]);
                }
            }

            this.running = false;

            docById("wheelDivptm").style.display = "none";
            if (!this.pitchWheel === undefined) {
                this._pitchWheel.removeWheel();
                this._exitWheel.removeWheel();
                this._accidentalsWheel.removeWheel();
                this._octavesWheel.removeWheel();
            }
            this.pitchAnalysers = {};
            widgetWindow.destroy();
        };

        widgetWindow.onmaximize = this._scale.bind(this);

        this.playBtn = widgetWindow.addButton("play-button.svg", ICONSIZE, _("Play"));
        this.playBtn.onclick = () => {
            console.log(abcNotationSong)
            if (this.isMoving) {
                this.pause();
                this.playBtn.innerHTML =
                    '<img src="header-icons/play-button.svg" title="' +
                    _("Play") +
                    '" alt="' +
                    _("Play") +
                    '" height="' +
                    ICONSIZE +
                    '" width="' +
                    ICONSIZE +
                    '" vertical-align="middle">';
                this.isMoving = false;
                
            } else {
                if (!(abcNotationSong =="")) {
                    console.log(abcNotationSong)
                    this.resume();
                    this._playABCSong();
                }
            }
        };


    
        this._save_lock = false;
        widgetWindow.addButton(
            "export-chunk.svg",
            ICONSIZE,
            _("Save sample"),
            ""
        ).onclick = function () {
            // Debounce button
            if (!that._get_save_lock()) {
                that._save_lock = true;
                that._saveSample();
                setTimeout(function () {
                    that._save_lock = false;
                }, 1000);
            }
        };

        widgetWindow.sendToCenter();
        this.widgetWindow = widgetWindow;

        this._scale();

        this._parseSamplePitch();
        this.getPitchName();

        this.setTimbre();

        this.activity.textMsg(_("Upload a sample and adjust its pitch center."));
        this.pause();

        widgetWindow.sendToCenter();
    };

    /**
     * Adds the current sample to the list of custom samples.
     * @returns {void}
     */
    this._addSample = function () {
        for (let i = 0; i < CUSTOMSAMPLES.length; i++) {
            if (CUSTOMSAMPLES[i][0] == this.sampleName) {
                return;
            }
        }
        CUSTOMSAMPLES.push([this.sampleName, this.sampleData]);
    };

    /**
     * Parses the sample pitch and sets the pitch, accidental, and octave centers accordingly.
     * @returns {void}
     */
    this._parseSamplePitch = function () {
        const first_part = this.samplePitch.substring(0, 2);
        if (first_part === "so") {
            this.pitchCenter = 4;
        } else {
            this.pitchCenter = SOLFEGENAMES.indexOf(first_part);
        }

        const sol = this.samplePitch;

        let lev;
        if (sol.indexOf(SHARP) != -1) {
            lev = 1;
        } else if (sol.indexOf(FLAT) != -1) {
            lev = -1;
        } else if (sol.indexOf(DOUBLEFLAT) != -1) {
            lev = -2;
        } else if (sol.indexOf(DOUBLESHARP) != -1) {
            lev = 2;
        } else {
            lev = 0;
        }
        this.accidentalCenter = lev + 2;
        this.octaveCenter = this.sampleOctave;
    };

    /**
     * Updates the sample pitch value based on the pitch, accidental, and octave centers.
     * @returns {void}
     */
    this._updateSamplePitchValues = function () {
        this.samplePitch =
            SOLFEGENAMES[this.pitchCenter] + EXPORTACCIDENTALNAMES[this.accidentalCenter];
        this.sampleOctave = this.octaveCenter.toString();
    };

    /**
     * Sets the timbre based on the current sample.
     * @returns {void}
     */
    this.setTimbre = function () {
        if (this.sampleName != null && this.sampleName != "") {
            this.originalSampleName = this.sampleName + "_original";
            const sampleArray = [this.originalSampleName, this.sampleData, "la", 4];
            Singer.ToneActions.setTimbre(sampleArray, 0, this.timbreBlock);
        }
    };

    /**
     * Plays the reference pitch based on the current sample's pitch, accidental, and octave.
     * @returns {void}
     */
    this._playABCSong = function () {
       var abc = abcNotationSong
       var stopAudioButton = document.querySelector(".stop-audio");
       console.log('abcd',abcNotationSong)

        var visualObj = ABCJS.renderAbc("*", abc, {
            responsive: "resize" })[0];

            if (ABCJS.synth.supportsAudio()) {
              

                // An audio context is needed - this can be passed in for two reasons:
                // 1) So that you can share this audio context with other elements on your page.
                // 2) So that you can create it during a user interaction so that the browser doesn't block the sound.
                // Setting this is optional - if you don't set an audioContext, then abcjs will create one.
                window.AudioContext = window.AudioContext ||
                    window.webkitAudioContext ||
                    navigator.mozAudioContext ||
                    navigator.msAudioContext;
                var audioContext = new window.AudioContext();
                audioContext.resume().then(function () {
                 
                    // In theory the AC shouldn't start suspended because it is being initialized in a click handler, but iOS seems to anyway.

                    // This does a bare minimum so this object could be created in advance, or whenever convenient.
                     midiBuffer = new ABCJS.synth.CreateSynth();

                    // midiBuffer.init preloads and caches all the notes needed. There may be significant network traffic here.
                    return midiBuffer.init({
                        visualObj: visualObj,
                        audioContext: audioContext,
                        millisecondsPerMeasure: visualObj.millisecondsPerMeasure()
                    }).then(function (response) {
                        console.log("Notes loaded: ", response)
                      
                        // midiBuffer.prime actually builds the output buffer.
                        return midiBuffer.prime();
                    }).then(function (response) {
                      
                        // At this point, everything slow has happened. midiBuffer.start will return very quickly and will start playing very quickly without lag.
                        midiBuffer.start();
                        
                        return Promise.resolve();
                    }).catch(function (error) {
                        if (error.status === "NotSupported") {
                            stopAudioButton.setAttribute("style", "display:none;");
                            var audioError = document.querySelector(".audio-error");
                            audioError.setAttribute("style", "");
                        } else
                            console.warn("synth error", error);
                    });
                });
            } else {
                var audioError = document.querySelector(".audio-error");
                audioError.setAttribute("style", "");
            }
   
    };

    /**
     * Plays the current sample.
     * @returns {void}
     */
    this._playSample = function () {
        if (this.sampleName != null && this.sampleName != "") {
            this.reconnectSynthsToAnalyser();

            this.activity.logo.synth.trigger(
                0,
                [CENTERPITCHHERTZ],
                this.sampleLength / 1000.0,
                "customsample_" + this.originalSampleName,
                null,
                null,
                false
            );
        }
    };

    /**
     * Waits for a specified time and then plays the sample.
     * @returns {Promise<string>} A promise that resolves once the sample is played.
     */
    this._waitAndPlaySample = function () {
        return new Promise((resolve) => {
            setTimeout(() => {
                this._playSample();
                resolve("played");
                this._endPlaying();
            }, SAMPLEWAITTIME);
        });
    };

    /**
     * Asynchronously plays the sample after a delay.
     * @returns {Promise<void>} A promise that resolves once the sample is played.
     */
    this._playDelayedSample = async function () {
        await this._waitAndPlaySample();
    };

    /**
     * Waits for the sample to finish playing.
     * @returns {Promise<string>} A promise that resolves once the sample playback ends.
     */
    this._waitAndEndPlaying = function () {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.pause();
                resolve("ended");
            }, this.sampleLength);
        });
    };

    /**
     * Asynchronously ends the sample playback after waiting for its duration.
     * @returns {Promise<void>} A promise that resolves once the sample playback ends.
     */
    this._endPlaying = async function () {
        await this._waitAndEndPlaying();
    };

    /**
     * Reconnects synths to the analyser for pitch analysis.
     * @returns {void}
     */
    this.reconnectSynthsToAnalyser = function () {
        // Make two pitchAnalysers for the ref tone and the sample.
        for (const instrument in [0, 1]) {
            if (this.pitchAnalysers[instrument] === undefined) {
                this.pitchAnalysers[instrument] = new Tone.Analyser({
                    type: "waveform",
                    size: SAMPLEANALYSERSIZE
                });
            }
        }

        // Connect instruments. Ref tone connects with the first pitchAnalyser.
        for (const synth in instruments[0]) {
            let analyser = 1;
            if (synth === REFERENCESAMPLE) {
                analyser = 0;
                instruments[0][synth].connect(this.pitchAnalysers[analyser]);
            }
            if (synth === "customsample_" + this.originalSampleName) {
                analyser = 1;
                instruments[0][synth].connect(this.pitchAnalysers[analyser]);
            }
        }
    };

    /**
     * Creates and initializes the pie menu for selecting pitch, accidentals, and octaves.
     * @returns {void}
     */
    this._createPieMenu = function () {
        docById("wheelDivptm").style.display = "";

        const accidentals = ["𝄪", "♯", "♮", "♭", "𝄫"];
        const noteLabels = ["ti", "la", "sol", "fa", "mi", "re", "do"];
        const drumLabels = [];
        let label;
        for (let i = 0; i < DRUMS.length; i++) {
            label = _(DRUMS[i]);
            drumLabels.push(label);
        }

        this._pitchWheel = new wheelnav("wheelDivptm", null, 600, 600);
        this._exitWheel = new wheelnav("_exitWheel", this._pitchWheel.raphael);

        this._accidentalsWheel = new wheelnav("_accidentalsWheel", this._pitchWheel.raphael);
        this._octavesWheel = new wheelnav("_octavesWheel", this._pitchWheel.raphael);

        wheelnav.cssMode = true;

        this._pitchWheel.keynavigateEnabled = false;
        this._pitchWheel.slicePathFunction = slicePath().DonutSlice;
        this._pitchWheel.slicePathCustom = slicePath().DonutSliceCustomization();

        this._pitchWheel.colors = platformColor.pitchWheelcolors;
        this._pitchWheel.slicePathCustom.minRadiusPercent = 0.2;
        this._pitchWheel.slicePathCustom.maxRadiusPercent = 0.5;

        this._pitchWheel.sliceSelectedPathCustom = this._pitchWheel.slicePathCustom;
        this._pitchWheel.sliceInitPathCustom = this._pitchWheel.slicePathCustom;

        this._pitchWheel.animatetime = 0; // 300;
        this._pitchWheel.createWheel(noteLabels);

        this._exitWheel.colors = platformColor.exitWheelcolors;
        this._exitWheel.slicePathFunction = slicePath().DonutSlice;
        this._exitWheel.slicePathCustom = slicePath().DonutSliceCustomization();
        this._exitWheel.slicePathCustom.minRadiusPercent = 0.0;
        this._exitWheel.slicePathCustom.maxRadiusPercent = 0.2;
        this._exitWheel.sliceSelectedPathCustom = this._exitWheel.slicePathCustom;
        this._exitWheel.sliceInitPathCustom = this._exitWheel.slicePathCustom;
        this._exitWheel.clickModeRotate = false;
        this._exitWheel.createWheel(["×", " "]);

        this._accidentalsWheel.colors = platformColor.accidentalsWheelcolors;
        this._accidentalsWheel.slicePathFunction = slicePath().DonutSlice;
        this._accidentalsWheel.slicePathCustom = slicePath().DonutSliceCustomization();
        this._accidentalsWheel.slicePathCustom.minRadiusPercent = 0.5;
        this._accidentalsWheel.slicePathCustom.maxRadiusPercent = 0.75;
        this._accidentalsWheel.sliceSelectedPathCustom = this._accidentalsWheel.slicePathCustom;
        this._accidentalsWheel.sliceInitPathCustom = this._accidentalsWheel.slicePathCustom;

        const accidentalLabels = [];
        for (let i = 0; i < accidentals.length; i++) {
            accidentalLabels.push(accidentals[i]);
        }

        for (let i = 0; i < 9; i++) {
            accidentalLabels.push(null);
            this._accidentalsWheel.colors.push(platformColor.accidentalsWheelcolorspush);
        }

        this._accidentalsWheel.animatetime = 0; // 300;
        this._accidentalsWheel.createWheel(accidentalLabels);
        this._accidentalsWheel.setTooltips([
            _("double sharp"),
            _("sharp"),
            _("natural"),
            _("flat"),
            _("double flat")
        ]);

        this._octavesWheel.colors = platformColor.octavesWheelcolors;
        this._octavesWheel.slicePathFunction = slicePath().DonutSlice;
        this._octavesWheel.slicePathCustom = slicePath().DonutSliceCustomization();
        this._octavesWheel.slicePathCustom.minRadiusPercent = 0.75;
        this._octavesWheel.slicePathCustom.maxRadiusPercent = 0.95;
        this._octavesWheel.sliceSelectedPathCustom = this._octavesWheel.slicePathCustom;
        this._octavesWheel.sliceInitPathCustom = this._octavesWheel.slicePathCustom;
        const octaveLabels = [
            "8",
            "7",
            "6",
            "5",
            "4",
            "3",
            "2",
            "1",
            null,
            null,
            null,
            null,
            null,
            null
        ];
        this._octavesWheel.animatetime = 0; // 300;
        this._octavesWheel.createWheel(octaveLabels);

        const x = this.pitchBtn.getBoundingClientRect().x;
        const y = this.pitchBtn.getBoundingClientRect().y;

        docById("wheelDivptm").style.position = "absolute";
        docById("wheelDivptm").style.height = "300px";
        docById("wheelDivptm").style.width = "300px";
        docById("wheelDivptm").style.left =
            Math.min(
                this.activity.canvas.width - 200,
                Math.max(0, x * this.activity.getStageScale())
            ) + "px";
        docById("wheelDivptm").style.top =
            Math.min(
                this.activity.canvas.height - 250,
                Math.max(0, y * this.activity.getStageScale())
            ) + "px";

        const octaveValue = this.octaveCenter;
        const accidentalsValue = 4 - this.accidentalCenter;
        const noteValue = 6 - this.pitchCenter;

        this._accidentalsWheel.navigateWheel(accidentalsValue);
        this._octavesWheel.navigateWheel(octaveLabels.indexOf(octaveValue.toString()));
        this._pitchWheel.navigateWheel(noteValue);

        this._exitWheel.navItems[0].navigateFunction = () => {
            docById("wheelDivptm").style.display = "none";
            this._pitchWheel.removeWheel();
            this._exitWheel.removeWheel();
            this._accidentalsWheel.removeWheel();
            this._octavesWheel.removeWheel();
        };

        const __selectionChanged = () => {
            const label = this._pitchWheel.navItems[this._pitchWheel.selectedNavItemIndex].title;
            const attr = this._accidentalsWheel.navItems[
                this._accidentalsWheel.selectedNavItemIndex
            ].title;
            const octave = Number(
                this._octavesWheel.navItems[this._octavesWheel.selectedNavItemIndex].title
            );

            this._usePitch(label);
            this._useAccidental(attr);
            this._useOctave(octave);

            this.getPitchName();
        };

        const __pitchPreview = () => {
            __selectionChanged();
            this._playABCSong();
        };

        for (let i = 0; i < noteLabels.length; i++) {
            this._pitchWheel.navItems[i].navigateFunction = __pitchPreview;
        }

        for (let i = 0; i < accidentals.length; i++) {
            this._accidentalsWheel.navItems[i].navigateFunction = __pitchPreview;
        }

        for (let i = 0; i < 8; i++) {
            this._octavesWheel.navItems[i].navigateFunction = __pitchPreview;
        }
    };

    /**
     * Retrieves the name of the current pitch.
     * @returns {void}
     */
    this.getPitchName = function () {
        let name = "";
        name = PITCHNAMES[this.pitchCenter];
        name += EXPORTACCIDENTALNAMES[this.accidentalCenter];
        name += this.octaveCenter.toString();
        this.pitchName = name;

        this.pitchBtn.value = this.pitchName;
    };

     /**
     * Scales the widget window and canvas based on the window's state.
     * @returns {void}
     */
    this._scale = function () {
        let width, height;
        const canvas = document.getElementsByClassName("samplerCanvas");
        Array.prototype.forEach.call(canvas, (ele) => {
            this.widgetWindow.getWidgetBody().removeChild(ele);
        });
        if (!this.widgetWindow.isMaximized()) {
            width = SAMPLEWIDTH;
            height = SAMPLEHEIGHT;
        } else {
            width = this.widgetWindow.getWidgetBody().getBoundingClientRect().width;
            height = this.widgetWindow.getWidgetFrame().getBoundingClientRect().height - 70;
        }
        document.getElementsByTagName("canvas")[0].innerHTML = "";
        this.makeCanvas(width, height, 0, true);
        this.reconnectSynthsToAnalyser();
    };

    /**
     * Creates a canvas element and draws visual representations of sample data and reference tones.
     * @param {number} width - The width of the canvas.
     * @param {number} height - The height of the canvas.
     * @param {number} turtleIdx - The index of the canvas.
     * @param {boolean} resized - Indicates if the canvas is resized.
     * @returns {void}
     */
    this.makeCanvas = function (width, height, turtleIdx, resized) {
        // Create a container to center the elements
        const container = document.createElement("div");
    
        this.widgetWindow.getWidgetBody().appendChild(container);
    
        // Create a scrollable container for the canvas
        const scrollContainer = document.createElement("div");
        scrollContainer.style.overflowY = "auto"; // Enable vertical scrolling
        scrollContainer.style.height = height + "px"; // Set the height of the scroll container
        scrollContainer.style.border = "1px solid #ccc"; // Optional: Add a border for visibility
        scrollContainer.style.marginBottom = "10px";
        scrollContainer.style.marginLeft = "20px";
        container.appendChild(scrollContainer);
    
        // Create the canvas element
        const canvas = document.createElement("canvas");
        canvas.height = height; // Keep the height for the scrollable area
        canvas.width = width;
        canvas.className = "samplerCanvas";
        canvas.style.marginLeft = "20px";
        scrollContainer.appendChild(canvas); // Append canvas to scroll container
    
        // Create the input text field
        const inputField = document.createElement("input");
        inputField.type = "text";
        inputField.className = "inputField";
        inputField.placeholder = "Enter text here";
        inputField.style.fontSize = "20px";
        inputField.style.padding = "10px";
        inputField.style.marginLeft = "180px";
        inputField.style.marginBottom = "10px";
        inputField.style.marginTop = "20px";
        container.appendChild(inputField);
    
        // Ensure inputField focuses when clicked
        inputField.addEventListener('click', function () {
            inputField.focus();
        });
    
        // Create the submit button
        const submitButton = document.createElement("button");
        submitButton.className = "submitButton";
        submitButton.textContent = "Submit";
        submitButton.style.fontSize = "20px";
        submitButton.style.padding = "10px 20px";
        container.appendChild(submitButton);
    
        // Get the canvas context
        const canvasCtx = canvas.getContext("2d");
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
        // Function to handle the submit button click
        submitButton.onclick = function () {
            const inputText = inputField.value.trim(); // Trim the input text
            if (inputText === "") {
                return; // Prevent further execution if input is empty
            }
    
            const apiUrl = 'http://127.0.0.1:5000/ask-ollama';
            const prompt_eng = `
            Generate an ABC notation song based on the following description:
            
            ${inputText}
            
            {
                "abc": "
            X: {index}
            T: {title}
            M: {meter}
            L: {length}
            Q: {tempo}
            K: {key}
            {notes}
                "
            }
            
            IMPORTANT:
            - Ensure that the response is only in ABC notation format.
            - Use only notes, not chords.
            - Do not provide any other content or formats, such as guitar tablature or chord diagrams.
            - If your response includes other formats, please only output the ABC notation content within the curly braces.
            - Do not add other text at the bottom such as "Let me know if you need any changes! "
            `;
    
            // Prepare the request body
            const requestBody = JSON.stringify({ prompt: prompt_eng });
    
            // Disable the submit button and show loading message
            submitButton.disabled = true; // Disable the submit button
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
            canvasCtx.font = "20px Arial";
            canvasCtx.fillStyle = "black";
            canvasCtx.fillText("Loading...", 20, 50); // Show loading message
    
            fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: requestBody
            })
                .then(response => response.json())
                .then(data => {
                    // Handle the response data
                    console.log('API Response:', data);
    
                    let responseText = data; // Adjust to match your API response structure
                    const abcStartIndex = responseText.indexOf("X:");
                    // Extract ABC notation starting from "X:" to the first closing brace "}"
                    let abcNotation = responseText.substring(abcStartIndex);

                    // Find the position of the first closing brace after the "X:" index
                    const closingBraceIndex = abcNotation.indexOf("}");
                    if (closingBraceIndex !== -1) {
                        // Extract the notation from "X:" to the closing brace "}"
                        abcNotation = abcNotation.substring(0, closingBraceIndex + 1);
                    } else {
                        // If there's no closing brace, just keep what we have (or handle the error)
                        console.warn("No closing brace found in the response.");
                    }

                    // Clean up the notation
                    abcNotation = abcNotation.replace(/"|\}/g, '') // Remove quotes and closing braces
                        .trim();

                    // Add newlines before each tag, while ensuring no unwanted indentation
                    abcNotation = abcNotation.replace(/(X:|T:|M:|L:|Q:|K:)/g, '\n$1').replace(/\n\s+/g, '\n').trim();
                    console.log(abcNotation);

                        let lines = abcNotation.split('\n').map(line => line.trim());

    
                        let formattedNotation = lines.map(line => {
                            // Add a newline after each header
                            if (line.startsWith('X:') || line.startsWith('T:') || line.startsWith('M:') ||
                                line.startsWith('L:') || line.startsWith('Q:') || line.startsWith('K:')) {
                                return line + '\n';
                            }
                            return line;
                        }).join('');

                        console.log(formattedNotation)
                        abcNotationSong=formattedNotation
                        console.log('blasdfsdfjkl',abcNotationSong)
                    // Add newline before each tag
                        console.log(abcNotation);
    
                    // Clear the canvas
                    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    
                    // Display the ABC notation song on the canvas
                    canvasCtx.font = "20px Arial";
                    canvasCtx.fillStyle = "black";
                    wrapText(canvasCtx, abcNotation, 20, 50, canvas.width - 20, 18);
                })
                .catch(error => {
                    // Handle any errors
                    console.error('Error:', error);
                    // Optionally, you can display an error message on the canvas if needed
                    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
                    canvasCtx.fillText("An error occurred: " + error.message, 20, 50);
                })
                .finally(() => {
                    // Re-enable the submit button
                    submitButton.disabled = false; // Re-enable the submit button
                });
        };
    
        function wrapText(context, text, x, y, maxWidth, lineHeight) {
            // Split the text into lines based on the newline character
            const lines = text.split('\n');
    
            // Loop through each line to measure and wrap it
            for (let i = 0; i < lines.length; i++) {
                const words = lines[i].split(' ');
                let line = '';
    
                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = context.measureText(testLine);
                    const testWidth = metrics.width;
    
                    // If the test line exceeds the max width, draw the line and start a new one
                    if (testWidth > maxWidth && n > 0) {
                        context.fillText(line, x, y);
                        line = words[n] + ' '; // Start a new line with the current word
                        y += lineHeight; // Move down for the next line
                    } else {
                        line = testLine; // Continue building the line
                    }
                }
    
                // Draw the last line of the current section
                context.fillText(line, x, y);
                y += lineHeight; // Move down for the next section
            }
        }
    };
    
    
    
    
    
}
