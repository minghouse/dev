const arr = ['a','b','c']

const arr2 = arr.find((v)=> {
    return v == 'b'
})
console.log(arr2)

//好了 執行看看
//試著根據結果，理解這個.find是做啥用的~ 也可以搭配滑鼠放到find上面看看，或著到Google搜尋「js array find」

const arr3 = [
    {
        name: 'ming',
        age: 28
    },
    {
        name: 'alex',
        age: 27
    },
    {
        name: 'david',
        age: 26
    }
]

//怎麼使用.find()，印出 {name: 'alex', age: 27}，請作答~
const arr4 = arr3.find((v)=> {
    
    //提示來了~
    //試著下一行使用console.log印出v
    
    console.log(v.name=='ming') //還是給你參考好了
    return v.name == 'alex'
    //這個是指name和age都要符合條件
    return v.name == 'alex' && v.age == 27 

    //這個因為知道v是一個object，所以==右邊也給一個object，就會相同了
    return v == {name:"alex", age: 27}
})
console.log(arr4)

const students = [
    { name: 'Alice', score: 85 },
    { name: 'Bob', score: 92 },
    { name: 'Charlie', score: 88 },
    { name: 'David', score: 95 },
  ];
  
  // 使用 Array.prototype.find() 找出分數超過 90 分的第一個學生
  const highScorer = students.find((student) => {
    return student.score > 90;
  });
  console.log(highScorer)

//使用array.find()找到 >2的數字
const array = [1, 2, 3, 4, 5];
const array2 = array.find((number) => {
    return number > 2;
});
console.log(array2)

//使用.find()找到Bob的資料
const people = [
    { name: 'Alice', age: 22 },
    { name: 'Bob', age: 28 },
    { name: 'Charlie', age: 25 },
    { name: 'David', age: 30 }
  ];
  const people2 = people.find((person) => {
    return person.name == "Bob" ;
});
console.log(people2)

//使用array.filter()找到 >2的數字
const array = [1, 2, 3, 4, 5];
const array2 = array.filter((number) => {
    return number > 2;
});
console.log(array2)