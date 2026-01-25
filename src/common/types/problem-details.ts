export type ProblemDetails = {
    // fields for RFC 7807
    type: string;
    title: string; //short title    
    status: number; // exception code
    detail?: string;
    instance?: string; // what request called the problem

    code?: string; // 
    errors?: string;
    timestamp?: string;
    requestId?: string;

}