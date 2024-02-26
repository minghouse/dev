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
    
})
console.log(arr4)