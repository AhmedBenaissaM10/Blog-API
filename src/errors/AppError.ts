class AppError extends Error {
    public  statusCode: number;
    public  status: 'fail'| 'error';
    public  isOperational: boolean = true;
    constructor( message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        Error.captureStackTrace(this, this.constructor);
    }
}
export default AppError;