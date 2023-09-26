import {ChatBaiduWenxin} from "langchain/chat_models/baiduwenxin";
import {BufferWindowMemory } from "langchain/memory";
import {
    SystemMessagePromptTemplate,
    ChatPromptTemplate,
    HumanMessagePromptTemplate
} from "langchain/prompts";
import {LLMChain} from "langchain/chains";

const memory = new BufferWindowMemory({ k: 6 });

// const systemMessage = SystemMessagePromptTemplate.fromTemplate("你是一个能够处理javascript代码的助手。");
const humanMessage = HumanMessagePromptTemplate.fromTemplate("{code}");
const chatPrompt = ChatPromptTemplate.fromPromptMessages([humanMessage]);

const model = new ChatBaiduWenxin({
    modelName:'ERNIE-Bot',
    getPathUrl({moduleName, subPath, baseUrl}){
        const env = process.env.NEXT_PUBLIC_ENV
        if(env === 'development') return '/baidu/' + subPath
        return baseUrl + subPath
    },
    baiduApiKey: process.env.NEXT_PUBLIC_BAIDU_API_KEY,
    baiduSecretKey: process.env.NEXT_PUBLIC_BAIDU_SECRE_KEY
});
export const chain = new LLMChain({ llm: model, memory, prompt: chatPrompt })
