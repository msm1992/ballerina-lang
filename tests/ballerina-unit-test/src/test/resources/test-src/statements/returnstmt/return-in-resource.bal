service<DummyService> helloWorld {
    sayHello(string x) {
        return x;
    }
}

type Config record {
};

type DummyEndpoint object {

    function init (Config conf)  {
    }
};
type DummyService object{

    function getEndpoint() returns (DummyEndpoint) {
        DummyEndpoint ep = new;
        return ep;
    }
};