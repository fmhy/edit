const arr = [{name: 'Alice', age: 30}, {name: 'Bob', age: 25}, {name: 'Charlie', age: 30}];

const groupedByAge = arr.reduce((groups, item) => {
  if (!groups[item.age]) {
    groups[item.age] = [];
  }
  groups[item.age].push(item);
  return groups;
}, {});

// groupedByAge is now equal to {25: [{name: 'Bob', age: 25}], 30: [{name: 'Alice', age: 30}, {name: 'Charlie', age: 30}]}
