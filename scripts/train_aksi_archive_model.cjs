const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const Lab=require("../aksi-visible-neural-lab.js");
(async()=>{
 const root=path.join(__dirname,"..");
 const datasetPath=path.join(root,"datasets/aksi-archive-theorem-corpus-v1.json");
 const datasetBytes=fs.readFileSync(datasetPath);
 const dataset=JSON.parse(datasetBytes.toString("utf8"));
 if(dataset.schema!=="AKSI-TRANSPARENT-TRAINING-DATASET/1")throw Error("Unexpected corpus schema");
 const corpus=dataset.entries.map(e=>e.text+" "+(e.caveat||"")).join("\n");
 const seed=14021995,epochs=8,hidden=24,contextSize=4,trainRatio=.8,learningRate=.025;
 const result=await Lab.train({corpus,seed,epochs,hidden,contextSize,trainRatio,learningRate});
 const modelJson=Lab.exportModel(result.model);
 const modelHash=crypto.createHash("sha256").update(modelJson).digest("hex");
 const corpusHash=crypto.createHash("sha256").update(corpus,"utf8").digest("hex");
 const report={
  schema:"AKSI-TRAINING-RUN/1",
  modelSchema:result.model.schema,
  runType:"CPU character MLP, supervised next-character prediction",
  trainedAt:new Date().toISOString(),
  algorithm:result.model.algorithm,
  parameters:{seed,epochs,hidden,contextSize,trainRatio,learningRate},
  dataset:{schema:dataset.schema,title:dataset.title,version:dataset.version,entryCount:dataset.entries.length,sha256:crypto.createHash("sha256").update(datasetBytes).digest("hex"),corpusSha256:corpusHash,sourceIds:dataset.sources.map(s=>s.id),sources:dataset.sources},
  split:result.model.metrics.split,
  metrics:result.model.metrics,
  history:result.model.history,
  model:{file:"aksi-theorem-pretrained.json",sha256:modelHash,parameterCount:result.model.W1.length+result.model.b1.length+result.model.W2.length+result.model.b2.length,vocabularySize:result.model.vocabSize},
  limitations:["A small character-level MLP is not a modern LLM.","Metrics measure next-character prediction, not factual accuracy or reasoning.","The model is trained on a small curated corpus; source metadata is not fed as structured input.","Archive entries preserve caveats; the corpus is not all mathematics or all AKSI history."]
 };
 const out=path.join(root,"training-results");fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,"aksi-theorem-pretrained.json"),modelJson+"\n");
 fs.writeFileSync(path.join(out,"training-report.json"),JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify({report:report.metrics,history:report.history,model:report.model,dataset:report.dataset,output:out},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
