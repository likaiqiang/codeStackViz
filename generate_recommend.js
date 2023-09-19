const {db} = require("./database")
const {TASKSTATUS} = require("./utils/server")
const {BundleManager} = require('./task')
const {logger} = require("./log");

const recommendRepo = [
    {
        key:'1',
        owner:'vuejs',
        repo:'vue',
        name:'',
        subPath:'src/compiler/index.ts'
    },
    {
        key:'1',
        owner:'vuejs',
        repo:'vue',
        name:'',
        subPath:'src/core/index.ts'
    },
    {
        key:'1',
        owner:'vuejs',
        repo:'vue-loader',
        name:'',
        subPath:'src/index.ts'
    },
    {
        key:'1',
        owner:'axios',
        repo:'axios',
        name:'',
        subPath:'lib/axios.js'
    },
    {
        key:'1',
        owner:'babel',
        repo:'babel',
        name:'',
        subPath:'packages/babel-generator/src/index.ts'
    },
    {
        key:'1',
        owner:'babel',
        repo:'babel',
        name:'',
        subPath:'packages/babel-parser/src/index.ts'
    }
]


const userCollection = db.collection('users')


async function start(){
    let recommendTasks = await userCollection.find({key:'1'}).toArray()
    if(recommendTasks.length === 0){
        const docs = recommendRepo.map(task=>{
            return {
                ...task,
                type:'recommend',
                status: TASKSTATUS.INIT
            }
        })
        await userCollection.insertMany(docs)
        recommendTasks = await userCollection.find({key:'1'}).toArray()
    }
    await Promise.all(
        recommendTasks.filter(task=> [TASKSTATUS.BUNDLEDERROR, TASKSTATUS.REPOCLONEDENDERROR].includes(task.status)).map(task=>{
            return userCollection.updateOne({_id: task._id},{$set:{status: TASKSTATUS.INIT}})
        })
    )
    await new BundleManager(userCollection, 'recommend').checkTask()
}
start().then(()=>{
    console.log('recommend done');
    process.exit()
})

