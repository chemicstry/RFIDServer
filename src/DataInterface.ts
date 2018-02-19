type DataCallback = (data: any) => void;

class DataInterface {
    downstream?: DataCallback;
    upstream: DataCallback;

    constructor(upstream: DataCallback) {
        this.upstream = upstream;
    }

    setCb(downstream: DataCallback)
    {
        this.downstream = downstream;
    }

    send(data: any)
    {
        if (this.upstream)
            this.upstream(data);
    }
}

export {
    DataInterface,
    DataCallback
};
