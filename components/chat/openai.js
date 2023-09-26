import {ChatOpenAI} from "langchain/chat_models/openai";
import {BufferWindowMemory } from "langchain/memory";
import {
    SystemMessagePromptTemplate,
    ChatPromptTemplate,
    HumanMessagePromptTemplate
} from "langchain/prompts";
import {LLMChain} from "langchain/chains";

const memory = new BufferWindowMemory({ k: 6 });

const systemMessage = SystemMessagePromptTemplate.fromTemplate("你是一个能够处理javascript代码的助手。");
const humanMessage = HumanMessagePromptTemplate.fromTemplate("{code}");
const chatPrompt = ChatPromptTemplate.fromPromptMessages([systemMessage, humanMessage]);

const model = new ChatOpenAI({
    modelName:'gpt-3.5-turbo-16k',
    temperature: 0.7,
    frequency_penalty: 0.2,
    presence_penalty: 0.2,
    openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY
});
export const chain = new LLMChain({ llm: model, memory, prompt: chatPrompt })
