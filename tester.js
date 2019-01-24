// Runs through some test cases to ensure that a bug doesn't occur in parsing times
function testAddTimeStr() {
    let date = new Date();

    let testIn = [
        ['11', '1230p'],
        ['630', '930p'],
        ['2', '3p'],
        ['9', '1030a'],
        ['8', '11a'],
        ['9', '12p'],
        ['10', '1p'],
        ['11', '2p'],
        ['12', '3p']
    ];

    let testOut = [
        [11, 12],
        [18, 21],
        [14, 15],
        [9, 10],
        [8, 11],
        [9, 12],
        [10, 13],
        [11, 14],
        [12, 15]
    ];

    for (let i = 0; i < testIn.length; i++) {
        let times = testIn[i];
        let output = addTimeStrToBase(times[0], times[1], date);
        let expected = testOut[i];

        console.log('Input: ' + times);
        console.log('Expected ' + expected + ' got '
            + output[0].getHours() + ' ' + output[1].getHours());

        let match = output[0].getHours() === expected[0] && output[1].getHours() === expected[1];
        if (!match) {
            console.log('Failed this case!');
        }
    }
}