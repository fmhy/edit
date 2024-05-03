const arr = [{name: 'Alice', age: 30}, {name: 'Bob', age: 25}, {name: 'Charlie', age: 30}];
const groupedByAge = groupBy(arr, item => item.age);
// groupedByAge is now equal to {25: [{name: 'Bob', age: 25}], 30: [{name: 'Alice', age: 30}, {name: 'Charlie', age: 30}]}
