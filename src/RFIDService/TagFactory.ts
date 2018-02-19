import { Tag, TagInfo } from './Tag';
import { Log } from 'Utils/Log';
import * as fs from 'fs';
import * as path from 'path';

class TagFactory
{
    // Holds all registered tag modules
    static Tags: typeof Tag[] = [];

    static Identify(info: TagInfo): typeof Tag
    {
        for (let tag of TagFactory.Tags)
        {
            if (tag.Identify(info))
                return tag;
        }

        throw new Error("Could not identify tag type");
    }

    static Register(classname: typeof Tag): void
    {
        let name = classname.name;


        if (!(classname.prototype instanceof Tag))
        {
            Log.error("TagFactory::Register(): Class is not instance of Tag", {name});
            return;
        }

        TagFactory.Tags.push(classname);

        Log.info("TagFactory::Register(): Registered tag", {name});
    }

    // Loads all tag modules from 'Tags' dir
    static InitializeTypes(): void
    {
        Log.verbose("TagFactory::InitializeTypes(): Scanning for modules");

        fs.readdir(path.join(__dirname, "Tags"), function(err, files)
        {
            for (let file of files)
            {
                Log.verbose("TagFactory::InitializeTypes(): Found module", {file});

                // ./Tags/TypeTag/TypeTag.ts
                let filePath = path.join(__dirname, "Tags", file, file + ".ts");

                fs.stat(filePath, async (err, stat) => {
                    if (!err && stat.isFile())
                    {
                        const module = await import(filePath);
                        TagFactory.Register(module.default);
                    }
                });
            }
        });
    }
}

TagFactory.InitializeTypes();

export {
    TagFactory
};
