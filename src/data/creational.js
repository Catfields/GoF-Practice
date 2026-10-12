module.exports = [
  {
    id: '1',
    index: 1,
    title: '小明的购物车',
    pattern: '单例模式',
    patternEn: 'Singleton',
    category: '创建型模式',
    difficulty: '简单',
    background: '小明在校园二手书平台做前端，用户从商品页挑了几本书、跳到结算页时购物车却清零了。排查半天才发现，每个页面都各自建了一份购物车，加进去的书落在了别的副本里。这次他要让全站共用同一辆购物车，不管从哪个页面打开，看到的都是同一份清单。',
    summary: '保证一个类仅有一个实例，并提供全局访问点。',
    concept: '单例模式（Singleton）确保某一个类在整个系统中只有一个实例，并且这个实例由一个全局访问点对外提供。它适用于那些在系统中必须唯一、需要被反复共享的对象，例如配置管理器、连接池、购物车等。实现的核心是把构造函数私有化（或借助语言特性），用静态方法 getInstance() 返回同一个实例。',
    structure: '参与者：\n- Singleton：单例类，持有唯一实例。\n- getInstance()：静态方法，返回唯一实例。\n- （私有）构造器/静态内部持有：防止外部直接 new。',
    scenario: '适用场景：\n- 系统中某类对象只需要一个实例，如配置、日志、任务管理器。\n- 需要控制资源访问，如线程池、数据库连接池。\n- 需要一个全局共享状态，如购物车、用户会话。',
    ioSchema: '第一行一个整数 T，表示操作数；接下来 T 行，每行一个操作：\n- add <item>：向购物车加入一件商品。\n- count：输出购物车中商品数量。\n- same：判断两次 getInstance() 是否得到同一个实例，是则输出 true 否则 false。',
    samples: [
      { input: '5\nadd apple\ncount\nsame\nadd banana\ncount', output: '1\ntrue\n2', explain: '两次获取实例指向同一对象（same 输出 true），购物车数量正确累加。' },
    ],
    testCases: [
      { input: '5\nadd apple\ncount\nsame\nadd banana\ncount', output: '1\ntrue\n2' },
      { input: '2\nsame\ncount', output: 'true\n0' },
      { input: '5\nadd x\nadd y\ncount\nadd z\ncount', output: '2\n3' },
    ],
    solutions: {
      python: `import sys

class ShoppingCart:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._items = []
        return cls._instance

    @classmethod
    def getInstance(cls):
        return cls()

    def add(self, item):
        self._items.append(item)

    def count(self):
        return len(self._items)


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        op = parts[0]
        cart = ShoppingCart.getInstance()
        if op == 'add':
            cart.add(parts[1])
        elif op == 'count':
            print(cart.count())
        elif op == 'same':
            a = ShoppingCart.getInstance()
            b = ShoppingCart.getInstance()
            print('true' if a is b else 'false')


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

public class Main {
    static class ShoppingCart {
        private static final ShoppingCart INSTANCE = new ShoppingCart();
        private List<String> items = new ArrayList<>();
        private ShoppingCart() {}
        public static ShoppingCart getInstance() { return INSTANCE; }
        public void add(String item) { items.add(item); }
        public int count() { return items.size(); }
    }

    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length == 0) continue;
            String op = parts[0];
            ShoppingCart cart = ShoppingCart.getInstance();
            if ("add".equals(op)) {
                cart.add(parts[1]);
            } else if ("count".equals(op)) {
                System.out.println(cart.count());
            } else if ("same".equals(op)) {
                System.out.println(ShoppingCart.getInstance() == ShoppingCart.getInstance());
            }
        }
    }
}
`,
    },
  },
  {
    id: '2',
    index: 2,
    title: '日志工场',
    pattern: '工厂方法模式',
    patternEn: 'Factory Method',
    category: '创建型模式',
    difficulty: '简单',
    background: '阿岚维护着公司后台的日志模块：本地调试时日志打在控制台，上线后要带上文件日志的标识。以前他在每个写日志的地方都塞了一堆条件判断，新增一种日志去向就要改十几处。这次他想把“挑一种日志”和“写日志”这两件事分开，调用方只说一句要哪种，剩下交给专门的地方去决定。',
    summary: '定义一个创建对象的接口，让子类决定实例化哪个类。',
    concept: '工厂方法模式（Factory Method）定义一个用于创建对象的接口，但由子类决定要实例化哪一个类，使类的实例化延迟到子类中。它把“创建对象”与“使用对象”解耦，客户端只依赖抽象工厂和抽象产品，新增一种产品时只需新增对应的工厂子类，无需改动既有调用代码。',
    structure: '参与者：\n- Product（抽象产品）：定义产品接口，如 Logger。\n- ConcreteProduct（具体产品）：如 ConsoleLogger、FileLogger。\n- Factory（抽象工厂）：声明 createProduct()。\n- ConcreteFactory（具体工厂）：重写工厂方法返回具体产品。',
    scenario: '适用场景：\n- 客户端不知道它需要的对象的具名类，只关心抽象接口时。\n- 希望把创建逻辑集中、便于扩展产品种类时。\n- 需要根据不同配置/参数返回不同实现时，如日志、数据库驱动。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- log <type> <message>：type 为 console 或 file，用对应日志器输出一行 `<Output>: <message>`。\n  console 对应“ConsoleLogger:”，file 对应“FileLogger:”。',
    samples: [
      { input: '3\nlog console hello\nlog file world\nlog console bye', output: 'ConsoleLogger: hello\nFileLogger: world\nConsoleLogger: bye', explain: '工厂根据 type 创建不同的日志器。' },
    ],
    testCases: [
      { input: '3\nlog console hello\nlog file world\nlog console bye', output: 'ConsoleLogger: hello\nFileLogger: world\nConsoleLogger: bye' },
      { input: '2\nlog file 写入成功\nlog console 启动完成', output: 'FileLogger: 写入成功\nConsoleLogger: 启动完成' },
      { input: '1\nlog file error occurred', output: 'FileLogger: error occurred' },
    ],
    solutions: {
      python: `import sys

class Logger:
    def log(self, msg):
        raise NotImplementedError

class ConsoleLogger(Logger):
    def log(self, msg):
        print("ConsoleLogger: " + msg)

class FileLogger(Logger):
    def log(self, msg):
        print("FileLogger: " + msg)

class LoggerFactory:
    @staticmethod
    def create_logger(type_):
        if type_ == 'console':
            return ConsoleLogger()
        return FileLogger()


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        logger = LoggerFactory.create_logger(parts[1])
        logger.log(' '.join(parts[2:]))


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;

interface Logger { void log(String msg); }
class ConsoleLogger implements Logger { public void log(String msg) { System.out.println("ConsoleLogger: " + msg); } }
class FileLogger implements Logger { public void log(String msg) { System.out.println("FileLogger: " + msg); } }
class LoggerFactory {
    public static Logger createLogger(String type) {
        if ("console".equals(type)) return new ConsoleLogger();
        return new FileLogger();
    }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length < 3) continue;
            Logger logger = LoggerFactory.createLogger(parts[1]);
            StringBuilder sb = new StringBuilder();
            for (int k = 2; k < parts.length; k++) {
                if (k > 2) sb.append(" ");
                sb.append(parts[k]);
            }
            logger.log(sb.toString());
        }
    }
}
`,
    },
  },
  {
    id: '3',
    index: 3,
    title: 'UI 主题工厂',
    pattern: '抽象工厂模式',
    patternEn: 'Abstract Factory',
    category: '创建型模式',
    difficulty: '中等',
    background: '设计组给一款阅读 App 加了浅色和深色两套主题，可上线后用户发现：切到深色时按钮变黑了，输入框却还是浅色的，看起来像补丁拼出来的。组长要求同一套主题里的按钮和输入框必须一起换，不能各挑各的。小周接下了这个活，他得让每次渲染出来的组件永远配套，来自同一套配色。',
    summary: '提供一个创建一系列相关或相互依赖对象的接口，无需指定具体类。',
    concept: '抽象工厂模式（Abstract Factory）提供一个接口，用于创建一系列相关或相互依赖的对象，而无需指定它们具体的类。它与工厂方法的区别在于：抽象工厂强调“一族”相互关联的产品，保证同一主题下的产品能协同工作（如浅色主题的按钮和文本框）。',
    structure: '参与者：\n- AbstractFactory：声明创建各产品族的抽象方法。\n- ConcreteFactory：实现创建某一具体产品族的方法，如 LightFactory、DarkFactory。\n- AbstractProduct/ConcreteProduct：按钮、文本框及其具体实现。',
    scenario: '适用场景：\n- 系统需要创建相互关联的产品族，且要保证同一族产品配套使用。\n- 需要支持多套主题/皮肤/平台切换，如跨平台 UI、深浅色主题。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- render <theme> <component>：theme 为 light 或 dark，component 为 button 或 textbox。\n  输出对应主题组件的渲染文本，例如“Light Button”“Dark TextBox”。',
    samples: [
      { input: '4\nrender light button\nrender dark textbox\nrender light textbox\nrender dark button', output: 'Light Button\nDark TextBox\nLight TextBox\nDark Button', explain: '不同工厂负责创建整套一致主题的组件。' },
    ],
    testCases: [
      { input: '4\nrender light button\nrender dark textbox\nrender light textbox\nrender dark button', output: 'Light Button\nDark TextBox\nLight TextBox\nDark Button' },
      { input: '2\nrender dark button\nrender light textbox', output: 'Dark Button\nLight TextBox' },
    ],
    solutions: {
      python: `import sys

class Button:
    def render(self):
        pass

class TextBox:
    def render(self):
        pass

class LightButton(Button):
    def render(self):
        return "Light Button"

class LightTextBox(TextBox):
    def render(self):
        return "Light TextBox"

class DarkButton(Button):
    def render(self):
        return "Dark Button"

class DarkTextBox(TextBox):
    def render(self):
        return "Dark TextBox"

class GUIFactory:
    def create_button(self):
        pass

    def create_textbox(self):
        pass

class LightFactory(GUIFactory):
    def create_button(self):
        return LightButton()

    def create_textbox(self):
        return LightTextBox()

class DarkFactory(GUIFactory):
    def create_button(self):
        return DarkButton()

    def create_textbox(self):
        return DarkTextBox()


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    factories = {'light': LightFactory(), 'dark': DarkFactory()}
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        factory = factories[parts[1]]
        if parts[2] == 'button':
            print(factory.create_button().render())
        else:
            print(factory.create_textbox().render())


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;
import java.util.*;

interface Button { String render(); }
interface TextBox { String render(); }
class LightButton implements Button { public String render() { return "Light Button"; } }
class LightTextBox implements TextBox { public String render() { return "Light TextBox"; } }
class DarkButton implements Button { public String render() { return "Dark Button"; } }
class DarkTextBox implements TextBox { public String render() { return "Dark TextBox"; } }

interface GUIFactory { Button createButton(); TextBox createTextBox(); }
class LightFactory implements GUIFactory {
    public Button createButton() { return new LightButton(); }
    public TextBox createTextBox() { return new LightTextBox(); }
}
class DarkFactory implements GUIFactory {
    public Button createButton() { return new DarkButton(); }
    public TextBox createTextBox() { return new DarkTextBox(); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        Map<String, GUIFactory> factories = new HashMap<>();
        factories.put("light", new LightFactory());
        factories.put("dark", new DarkFactory());
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length < 3) continue;
            GUIFactory f = factories.get(parts[1]);
            if ("button".equals(parts[2])) System.out.println(f.createButton().render());
            else System.out.println(f.createTextBox().render());
        }
    }
}
`,
    },
  },
  {
    id: '4',
    index: 4,
    title: '电脑组装',
    pattern: '建造者模式',
    patternEn: 'Builder',
    category: '创建型模式',
    difficulty: '中等',
    background: '老陈在电脑城里开了家装机店，最近接了个公司团购单：既要几台打游戏的高配机，也要一批日常办公的机器。以前他每装一台就在单子上随手填 CPU、显卡和内存，两次配置常常填得不一样，返工了好几回。这回他先把两种机型的配置固定成流程，接单时只报机型，店里照流程一步步装，出来的机器就不会跑偏。',
    summary: '将一个复杂对象的构建与表示分离，使同样的构建过程可以创建不同的表示。',
    concept: '建造者模式（Builder）将一个复杂对象的构建过程与它的表示分离，使得同样的构建过程可以创建不同的表示。它通过一步步设置零件（setCPU、setGPU、setRAM），最后调用 build() 生成成品，从而避免构造函数参数爆炸，也让构建步骤可以被复用和编排。',
    structure: '参与者：\n- Builder：定义构建产品各部分的抽象接口。\n- ConcreteBuilder：实现接口，逐步装配并返回产品。\n- Director：编排构建过程，指挥 Builder 组装的顺序。\n- Product：最终构造的复杂对象，如 Computer。',
    scenario: '适用场景：\n- 需要创建的对象有很多可选参数或复杂内部结构。\n- 需要将构建步骤与最终表示解耦，支持不同配置组装同一产品。\n- 希望按固定流程生成不同风格的对象，如电脑、套餐、报表。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行：\n- build <kind>：kind 为 gaming 或 office，按指定配置组装电脑并输出一行 `CPU: <cpu>, GPU: <gpu>, RAM: <ram>`。\n  游戏机：i9 / RTX 4090 / 32GB；办公机：i5 / integrated / 16GB。',
    samples: [
      { input: '2\nbuild gaming\nbuild office', output: 'CPU: i9, GPU: RTX 4090, RAM: 32GB\nCPU: i5, GPU: integrated, RAM: 16GB', explain: 'Director 指挥 Builder 按不同配置组装电脑。' },
    ],
    testCases: [
      { input: '2\nbuild gaming\nbuild office', output: 'CPU: i9, GPU: RTX 4090, RAM: 32GB\nCPU: i5, GPU: integrated, RAM: 16GB' },
      { input: '3\nbuild office\nbuild gaming\nbuild office', output: 'CPU: i5, GPU: integrated, RAM: 16GB\nCPU: i9, GPU: RTX 4090, RAM: 32GB\nCPU: i5, GPU: integrated, RAM: 16GB' },
    ],
    solutions: {
      python: `import sys

class Computer:
    def __init__(self):
        self.cpu = None
        self.gpu = None
        self.ram = None

    def __str__(self):
        return "CPU: {}, GPU: {}, RAM: {}".format(self.cpu, self.gpu, self.ram)

class ComputerBuilder:
    def __init__(self):
        self.computer = Computer()

    def set_cpu(self, cpu):
        self.computer.cpu = cpu
        return self

    def set_gpu(self, gpu):
        self.computer.gpu = gpu
        return self

    def set_ram(self, ram):
        self.computer.ram = ram
        return self

    def build(self):
        return self.computer

class Director:
    @staticmethod
    def build_gaming(builder):
        return builder.set_cpu('i9').set_gpu('RTX 4090').set_ram('32GB').build()

    @staticmethod
    def build_office(builder):
        return builder.set_cpu('i5').set_gpu('integrated').set_ram('16GB').build()


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        builder = ComputerBuilder()
        if parts[1] == 'gaming':
            computer = Director.build_gaming(builder)
        else:
            computer = Director.build_office(builder)
        print(computer)


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;

class Computer {
    String cpu, gpu, ram;
    public String toString() { return "CPU: " + cpu + ", GPU: " + gpu + ", RAM: " + ram; }
}

class ComputerBuilder {
    private Computer computer = new Computer();
    public ComputerBuilder setCpu(String cpu) { computer.cpu = cpu; return this; }
    public ComputerBuilder setGpu(String gpu) { computer.gpu = gpu; return this; }
    public ComputerBuilder setRam(String ram) { computer.ram = ram; return this; }
    public Computer build() { return computer; }
}

class Director {
    static Computer buildGaming(ComputerBuilder b) {
        return b.setCpu("i9").setGpu("RTX 4090").setRam("32GB").build();
    }
    static Computer buildOffice(ComputerBuilder b) {
        return b.setCpu("i5").setGpu("integrated").setRam("16GB").build();
    }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length < 2) continue;
            ComputerBuilder b = new ComputerBuilder();
            Computer c = "gaming".equals(parts[1]) ? Director.buildGaming(b) : Director.buildOffice(b);
            System.out.println(c);
        }
    }
}
`,
    },
  },
  {
    id: '5',
    index: 5,
    title: '矩形克隆',
    pattern: '原型模式',
    patternEn: 'Prototype',
    category: '创建型模式',
    difficulty: '简单',
    background: '小美用绘图工具做海报，调好一个红色矩形后要复制出十几个一模一样的副本，再逐个改成别的颜色。可第二天她发现，只改了其中一个副本，其他矩形竟然跟着一起变了，只好全部返工。她希望复制出来的每个矩形都是独立的一份，改动谁都不影响其他任何一个。',
    summary: '通过复制已有实例来创建新对象，而不依赖具体类。',
    concept: '原型模式（Prototype）用原型实例指定要创建对象的种类，并通过复制（克隆）这个原型来创建新对象。它适用于创建成本较高、或对象初始化繁琐的场景；克隆出的对象与原型相互独立，修改其一不影响另一个（深拷贝）。',
    structure: '参与者：\n- Prototype：声明克隆自身的接口，如 clone()。\n- ConcretePrototype：实现克隆方法，返回自身的一个副本。\n- Client：通过调用原型对象的 clone() 创建新对象。',
    scenario: '适用场景：\n- 创建新对象代价高，而复制已有对象更高效时。\n- 对象初始化需要大量参数或外部依赖时。\n- 需要保留某个对象的状态快照并在此基础上派生新对象时。',
    ioSchema: '第一行一个整数 T；接下来 T 行，每行一个操作：\n- set <color>：设置原始矩形的颜色。\n- clone：克隆原始矩形，输出 `clone:<克隆后的颜色>`。\n- paint <color>：修改原始矩形的颜色。\n- show original|clone：输出对应矩形的颜色。',
    samples: [
      { input: '5\nset red\nclone\npaint blue\nshow original\nshow clone', output: 'clone:red\nblue\nred', explain: '克隆后各自独立：原始被涂成 blue，克隆仍为 red。' },
    ],
    testCases: [
      { input: '5\nset red\nclone\npaint blue\nshow original\nshow clone', output: 'clone:red\nblue\nred' },
      { input: '4\nset green\nclone\npaint yellow\nshow clone', output: 'clone:green\ngreen' },
    ],
    solutions: {
      python: `import sys
import copy

class RectangleProto:
    def __init__(self, color=''):
        self.color = color

    def clone(self):
        return copy.deepcopy(self)


def main():
    data = sys.stdin.read().splitlines()
    if not data:
        return
    original = RectangleProto()
    clone = None
    t = int(data[0].strip())
    for i in range(1, t + 1):
        parts = data[i].split()
        if not parts:
            continue
        op = parts[0]
        if op == 'set':
            original.color = parts[1]
        elif op == 'clone':
            clone = original.clone()
            print("clone:" + clone.color)
        elif op == 'paint':
            original.color = parts[1]
        elif op == 'show':
            print(original.color if parts[1] == 'original' else clone.color)


if __name__ == '__main__':
    main()
`,
      java: `import java.io.*;

class RectangleProto {
    String color = "";
    public RectangleProto() {}
    public RectangleProto(String color) { this.color = color; }
    public RectangleProto clone() { return new RectangleProto(this.color); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        int t = Integer.parseInt(line.trim());
        RectangleProto original = new RectangleProto();
        RectangleProto clone = null;
        for (int i = 0; i < t; i++) {
            String l = br.readLine();
            if (l == null) break;
            String[] parts = l.trim().split(" ");
            if (parts.length == 0) continue;
            String op = parts[0];
            if ("set".equals(op)) {
                original.color = parts[1];
            } else if ("clone".equals(op)) {
                clone = original.clone();
                System.out.println("clone:" + clone.color);
            } else if ("paint".equals(op)) {
                original.color = parts[1];
            } else if ("show".equals(op)) {
                System.out.println("original".equals(parts[1]) ? original.color : clone.color);
            }
        }
    }
}
`,
    },
  },
];