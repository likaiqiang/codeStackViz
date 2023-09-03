import path from "path";

const resourcesFolderPath = path.join(process.cwd(),'public/recommend')

export default async function handler(req,res){
    if (req.method.toUpperCase() !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
}
